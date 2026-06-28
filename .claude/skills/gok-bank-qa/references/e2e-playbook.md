# E2E playbook — playwright-cli for exploration, @playwright/test for the committed net

Two tools, two jobs. **`playwright-cli`** (the inherited skill at `Desktop/personal/.claude/skills/
playwright-cli/`) is how you *explore and prove* — drive the live app, take a11y snapshots and screenshots,
reproduce a defect. **`@playwright/test`** (committed under `e2e/`) is the *regression net* you leave
behind. Exploration finds the bug; the committed spec stops it coming back.

## Live exploration with playwright-cli

Driven entirely through Bash (the skill allows `Bash(playwright-cli:*)`, `Bash(npx:*)`, `Bash(npm:*)`).

- **Start a session against the running dev server** (`npm run dev` on `:5173`). Use a named session so
  steps share state: `playwright-cli open -s=qa`, then `playwright-cli goto /payments/exchange -s=qa`.
- **See the page** with a snapshot (accessibility-tree YAML) — the primary way to "see" and to get the
  element refs (`e15`, …) you act on. Prefer snapshots over screenshots for *finding* elements; use
  screenshots for *evidence*.
- **Act by ref**: `click`, `fill --submit`, `type`, `press`, `select`, `check`, `upload`, `hover`, `drag`.
- **Capture evidence**: `playwright-cli screenshot --path assessmentv1/<domain>/screenshots/<id>.png`.
  For a flow defect, screenshot each step.
- **Reuse auth**: load the saved storage state so you start inside the `(app)` shell instead of re-logging
  in each time (`state-load`, matching the committed `storageState` — see below).
- **Console / network / failure injection**: use `playwright-cli console` / `requests` for errors, and
  `route`/`unroute` to mock a failing fetch when you need to test the unhappy path. For deeper perf/console
  work the chrome-devtools MCP (`list_console_messages`, `list_network_requests`,
  `performance_start_trace`, `lighthouse_audit`) is richer.
- **UI review**: `playwright-cli show --annotate` lets a human draw on the live page — useful when handing
  a visual defect back with a marked-up screenshot.

## The committed suite — @playwright/test

Lives in `e2e/`, organized **per domain** (`e2e/payments/`, `e2e/accounts/`, …) plus `e2e/support/`.

**Config (`playwright.config.ts`):**
- `testDir: 'e2e'`, `baseURL: 'http://localhost:5173'`.
- `webServer`: `command: 'npm run dev'`, `port: 5173`, `reuseExistingServer: !process.env.CI`. (Document
  that CI may switch to `npm run build && npm run preview` on `:4173` for a production-shaped run.)
- `use.storageState`: the saved auth state from global-setup, so specs start authenticated.
- Project: `chromium` to start. An optional second project with a mobile viewport (e.g. iPhone) feeds the
  reachability checks `gok-bank-ux-audit` cares about.
- `use.trace: 'on-first-retry'`, `screenshot: 'only-on-failure'` — evidence on failure for free.

**Auth fixture (`e2e/support/global-setup.ts`):** auth is mock/deterministic, so sign in once and save
`storageState` to a file the config points at. All specs then load authenticated. If sign-in seeds
`localStorage`/a token rather than a cookie, capture whatever the app reads (localStorage included — the
saved state covers it).

**Spec conventions:**
- Name by behaviour: `send-money.happy-path.spec.ts`, `exchange.fee-matches-commit.spec.ts`,
  `statements.single-primary-button.spec.ts`.
- One critical journey or one locked regression per file; keep them independent and order-free.
- **Selectors**: `getByRole(name)` → `getByText` → `getByTestId` → never `href`/nth-child. Web-component
  actions don't expose `href`; if a control isn't reachable, request a minimal `data-testid` via the Svelte
  MCP rather than writing a brittle structural selector.
- **Waits**: assert on a registered element appearing (`await expect(locator).toBeVisible()`); don't
  hard-sleep. Remember first paint is blank until the custom elements register.
- **Money assertions**: assert the displayed/committed amounts agree to the cent; a small helper in
  `e2e/support/` can parse grouped money back to minor units.

## What gets a committed spec

- **Every P0 happy path** — the money spine completes end to end (gather → review → confirm → success) with
  the disclosed amount matching the committed amount.
- **Every confirmed S1/S2** — a spec that fails on the buggy behaviour and passes once fixed, so it can't
  regress unseen.
- **High-value state coverage** — at least the empty and error states of P0/P1 surfaces.

Don't chase 100% — chase the paths where a silent regression would cost money or trust. Log in the finding
which paths you covered and which you deliberately left to manual, so coverage is honest.

## Healing

When a committed spec breaks because the UI legitimately changed (not a regression), re-snapshot the flow
with `playwright-cli`, update the locator/assertion, and note it. Don't delete a failing spec to go
green — confirm first whether it caught a real regression. A spec that "had to be deleted to pass" is
usually a found bug.
