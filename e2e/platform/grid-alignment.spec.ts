import { test, expect, gotoApp } from "../support/fixtures";

/**
 * X06 layout spine — the regression guard that makes the grid enforceable.
 *
 * The problem this system solves is not visible in any single screenshot: before it, the
 * app had 31 distinct `grid-template-columns` values, so two sections of the SAME page
 * could put their cards on different column lines (/accounts laid wallets on a 16rem
 * auto-fill track and pots on a 13rem one). Nothing looked broken; it just never read as
 * one composition.
 *
 * So these tests assert geometry, not appearance. Every run of cells on a migrated route
 * must start on the same x as every other run on that route, and the shared roles must
 * resolve to the same lines across DIFFERENT routes.
 *
 * Two failure modes are covered deliberately, because both were hit during the migration
 * and neither is visible without measuring:
 *  - a leftover `display: flex` on a section (route styles are unlayered, so they beat the
 *    layer that makes `.section` a grid) silently collapses the subgrid underneath it;
 *  - a stale `grid-template-columns` in a media query invalidates `subgrid` on the element
 *    that declares it, which then falls back to its own tracks.
 * Both show up here as runs whose left edges stop agreeing.
 */

const MIGRATED = [
  "/home",
  "/accounts",
  "/invest",
  "/payments",
  "/cards",
  "/budgets",
] as const;

/**
 * The migrated routes that actually contain runs of cells. /cards is deliberately absent:
 * CardStrip is the system's one documented exception, laying payment-card art on an
 * intrinsic 16rem track because a card is fixed-aspect media at a real physical size. Its
 * page wrapper is still on the spine, so it stays in MIGRATED for the overflow and subgrid
 * checks — it just has no run to align.
 */
const WITH_RUNS = MIGRATED.filter((r) => r !== "/cards");

/**
 * The page's actual track lines, plus the left edge of every cell in every run.
 *
 * Asserting "cells sit on a track line" rather than "runs start at the same x" is
 * deliberate — the weaker version passes a mutation that swaps one run from `cell-third` to
 * `cell-quarter`, because both still begin at the content's leading edge. Landing on a real
 * line of the shared 12-track grid is the invariant the whole system actually claims.
 */
async function gridGeometry(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const grid = document.querySelector(".page-grid");
    if (!grid) return null;
    const origin = grid.getBoundingClientRect().left;
    const gutter = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const tracks = getComputedStyle(grid)
      .gridTemplateColumns.split(" ")
      .map(parseFloat)
      .filter((n) => !Number.isNaN(n));

    // Two distinct sets. A cell's LEFT edge lands on a track start; its RIGHT edge lands on
    // a track end, which is a track start minus the gutter — not the same set of numbers.
    const starts: number[] = [];
    const ends: number[] = [];
    let x = origin;
    for (const t of tracks) {
      starts.push(x);
      ends.push(x + t);
      x += t + gutter;
    }

    const cells = [...document.querySelectorAll(".grid-run")].flatMap((run) =>
      [...run.children].map((cell) => ({
        cls: (cell as HTMLElement).className,
        left: cell.getBoundingClientRect().left,
        right: cell.getBoundingClientRect().right,
      })),
    );
    return { starts, ends, cells, trackCount: tracks.length };
  });
}

test.describe("the layout spine", () => {
  for (const route of WITH_RUNS) {
    test(`${route} snaps every cell to a track line of the page grid`, async ({
      page,
    }) => {
      await gotoApp(page, route);
      const geo = await gridGeometry(page);

      expect(geo, `${route} should render a .page-grid`).not.toBeNull();
      expect(geo!.trackCount, `${route} should expose 12 tracks`).toBe(12);
      // If a route quietly loses its runs the remaining assertions would pass vacuously,
      // which is itself the regression worth catching.
      expect(
        geo!.cells.length,
        `${route} should have cells in a .grid-run`,
      ).toBeGreaterThan(0);

      const near = (set: number[], x: number) =>
        set.some((l) => Math.abs(l - x) <= 1);

      for (const cell of geo!.cells) {
        expect(
          near(geo!.starts, cell.left),
          `${route}: cell "${cell.cls}" starts at ${cell.left.toFixed(1)}, off the track ` +
            `starts (${geo!.starts.map((l) => l.toFixed(0)).join(", ")})`,
        ).toBe(true);
        expect(
          near(geo!.ends, cell.right),
          `${route}: cell "${cell.cls}" ends at ${cell.right.toFixed(1)}, off the track ` +
            `ends (${geo!.ends.map((l) => l.toFixed(0)).join(", ")})`,
        ).toBe(true);
      }
    });
  }

  test("a shared cell role resolves to the same lines on different routes", async ({
    page,
  }) => {
    // `.cell-third` is the app's most-used role. Wallet cards on /accounts, action tiles on
    // /payments and subscription cards on /budgets all claim it, so all three must land on
    // exactly the same column lines. This is the cross-route claim the whole system makes.
    const lines: Record<string, number[]> = {};
    for (const route of ["/accounts", "/payments", "/budgets"]) {
      await gotoApp(page, route);
      lines[route] = await page.evaluate(() =>
        [...document.querySelectorAll(".grid-run > .cell-third")]
          .map((c) => Math.round(c.getBoundingClientRect().left))
          .filter((x, i, all) => all.indexOf(x) === i)
          .sort((a, b) => a - b),
      );
    }

    const routes = Object.keys(lines).filter((r) => lines[r].length >= 2);
    expect(
      routes.length,
      "expected .cell-third runs on at least two routes",
    ).toBeGreaterThan(1);
    for (const route of routes) {
      expect(lines[route], `cell-third lines differ on ${route}`).toEqual(
        lines[routes[0]],
      );
    }
  });

  test("no route overflows its content column horizontally", async ({
    page,
  }) => {
    for (const route of MIGRATED) {
      await gotoApp(page, route);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflows, `${route} overflows horizontally`).toBe(false);
    }
  });

  test("subgrid actually resolves — sections are grids, runs inherit their tracks", async ({
    page,
  }) => {
    // The computed style is the only reliable check. Both bugs found during the migration
    // looked plausible on screen while `grid-template-columns` read back as pixel tracks
    // instead of `subgrid`.
    //
    // Resolving to `subgrid` is the assertion that bites, not just "the parent is a grid". A
    // run that keeps its own `grid-template-columns` still renders cells on legal lines — they
    // simply go full width and stack — so geometry alone cannot see it.
    for (const route of MIGRATED) {
      await gotoApp(page, route);
      const bad = await page.evaluate(() => {
        if (!document.querySelector(".page-grid")) {
          return [{ cls: ".page-grid", why: "missing" }];
        }
        return [...document.querySelectorAll(".grid-run")].flatMap((run) => {
          const parent = run.parentElement;
          if (!parent || getComputedStyle(parent).display !== "grid") {
            return [{ cls: run.className, why: "parent is not a grid" }];
          }
          // The direct invariant: a `.grid-run` must RESOLVE to subgrid. If anything
          // overrode `grid-template-columns` the computed value is a track list instead,
          // and the run is laying out on tracks of its own.
          const resolved = getComputedStyle(run).gridTemplateColumns;
          if (!resolved.startsWith("subgrid")) {
            return [
              {
                cls: run.className,
                why: `resolved to "${resolved}" instead of subgrid`,
              },
            ];
          }
          return [];
        });
      });
      expect(
        bad,
        `${route}: a .grid-run is not inheriting the page tracks`,
      ).toEqual([]);
    }
  });
});
