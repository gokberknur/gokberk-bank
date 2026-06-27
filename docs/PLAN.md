# gokberk-bank — a personal banking/investing demo app

> Durable reference plan. Built in **multiple planning passes before any code**. This document is the
> source of truth for those passes; `tasks/backlog.md` is the actionable tracker derived from it.

## Execution approach: staged

**Step 1 (done) = init only:** create the repo, `git init`, commit this plan + backlog. **No scaffolding,
no dependencies, no app code yet** — those come in later, separately-approved planning steps.

## Context

A **new, separate repository**: a personal banking + investing web app that blends **Revolut** (modern
neobank feel — cards, instant spend, budgets, multi-currency), **Nordnet** (investing depth — portfolio,
trading, watchlists, candlesticks), and **traditional online banking** (IBAN transfers, scheduled payments,
statements, loans). It must look like a **serious, production-grade app** with **many features**, and it
doubles as a **dogfooding consumer** of the published `@gokberknur/design-system` package — a second
flagship alongside `gokberk-tools`.

Frontend-only SPA with mock/seeded data (no real backend, no real auth). Built with **SvelteKit + Svelte 5
(runes)**, authored through the **Svelte MCP**, composed from `gok-*` web components and `--gok-*` tokens.

Decisions already made:

- **Scope:** build the **entire** feature inventory (core + stretch surfaces).
- **Dogfooding findings:** tracked in **this repo only** (`docs/dogfooding-findings.md`); the design-system
  repo's backlog is **not** touched as part of this work.
- **Repo / domain:** `~/Desktop/personal/gokberk-bank` → eventual `bank.gokberk.se`.
- **Template:** clone the proven shape of `gokberk-tools` exactly.

## Reference (the proven template)

`gokberk-tools` (`/Users/gokberknur/Desktop/personal/gokberk-tools`) is the flagship DS consumer and the
exact shape to mirror: **SvelteKit 2 + Svelte 5 + Vite 8 + TypeScript**, `@sveltejs/adapter-static` with
`fallback: 'index.html'`, **pure client SPA** (`ssr=false`, `prerender=false`), Node `>=24`, Lit deduped in
Vite. The DS is consumed as the published package via `standalone.css` + eager per-element registration in
`src/lib/gok.ts`, with web-component interop through `src/lib/wc.svelte.ts` (`setProps` / `on` attachments).
State is rune-class singletons in `src/lib/state/*.svelte.ts` with `localStorage` + cross-tab `storage` sync.

Files to **copy verbatim or near-verbatim** into this repo: `src/lib/wc.svelte.ts`, `src/app.html`
(theme/density pre-paint script), `src/routes/+layout.ts`, `svelte.config.js`, `vite.config.ts`
(`resolve.dedupe: ['lit']`), `src/app.d.ts` (the `SVGAttributes.slot` patch), `tsconfig.json`, `.nvmrc`
(`24`), `.github/workflows/ci.yml`, and `src/lib/state/density.svelte.ts` as the state-singleton pattern.
`src/lib/gok.ts` is copied and the registration list trimmed/extended to what this app uses.

## Two authorities (copy this convention from gokberk-tools' CLAUDE.md)

1. **The Svelte MCP governs how code is written.** Author/edit every `.svelte` / `.svelte.ts` through the
   Svelte MCP (`svelte:svelte-file-editor` agent + autofixer). Never hand-write Svelte 5 from memory.
2. **The `gokberk-design` skill governs how it looks.** Compose every route against its
   `patterns.md` / `brand-language.md` / `voice-and-tone.md`; verify against `verification.md`. Brand rules:
   never hardcode a hex/px/radius/easing (read a `--gok-*` semantic role), build with `gok-*` first,
   monochrome canvas + one earned forest-green accent per context, mono-uppercase eyebrow, status by
   rule+icon+text (never colour alone), logical CSS properties, light/dark/compact all verified.

## Web-component interop rules (the gotchas that bite in Svelte)

- **Registration is client-only** (`ssr=false`); elements register via side-effect subpath imports in
  `src/lib/gok.ts`, imported once from the root layout.
- **No `bind:value` on `gok-*`.** Set `value` as a property and update state from the `change`/`input` event.
- **Rich props (objects/arrays) must be set as DOM *properties*, not attributes** → use `setProps({...})`
  from `wc.svelte.ts`. Mandatory for `gok-table`'s `columns`/`rows`. Attributes stringify and break.
- **Hyphenated composed events** (`gok-sort`, `gok-selection-change`, `gok-page-change`, `gok-close`,
  `gok-cancel`, `gok-select`, `gok-open`, `gok-dismiss`) have no `on*` prop → subscribe with `on(type, fn)`.
  Plain controls (`gok-input`, `gok-checkbox`, `gok-switch`, `gok-select`, `gok-radio-group`,
  `gok-segmented`, `gok-tabs`, `gok-theme-switch`) emit standard `change`/`input`.
- **Typing:** the package ships no Svelte `IntrinsicElements` augmentation, so `gok-*` tags aren't
  type-checked in markup. Keep `svelte-check` green via the copied `app.d.ts`; optionally add a local
  `declare namespace svelteHTML` later for typed attributes (nice-to-have, not blocking).

## Charts (the one real architectural gap — DS has no chart component)

Chart-heavy app; the design system ships **no** chart primitive. Recommended (all permissive OSS; Highcharts
rejected as paid):

- **TradingView Lightweight Charts** (Apache-2.0, ~45 KB) — the **financial** specialist: candlestick/OHLC,
  volume, crosshair, time-range zoom (the Nordnet/TradingView feel). One attribution string attached
  (`attributionLogo` / a visible TradingView link) — satisfy it and it's compliant.
- **Apache ECharts** (Apache-2.0, fully free, ~100 KB tree-shaken) — **everything else**: line, area,
  sparkline, donut/allocation, stacked-bar trends, treemap/heatmap.
- Both are canvas + imperative → both wrap identically in Svelte 5 via `onMount`/`$effect`, and both consume
  **one shared token-bridge helper** (`src/lib/charts/theme.ts`): reads `--gok-*` values via
  `getComputedStyle(document.documentElement).getPropertyValue(...)`, builds a theme object, re-applies on a
  `MutationObserver` watching `data-theme` on `<html>`. Write the bridge once, share it.
- **Alternative noted, not chosen by default:** LayerChart v2 (MIT, Svelte-native, themes natively with
  `var(--gok-*)`) for the dashboard half — most on-brand, but still pre-1.0/`@next`. Default stays
  Lightweight Charts + ECharts for maturity + coverage.
- All chart components live under `src/lib/charts/` as thin Svelte wrappers; **no chart logic leaks into
  routes**. Log the missing-chart-primitive friction in `docs/dogfooding-findings.md`.

## Mock-data architecture

A **seeded, internally-consistent** data layer under `src/lib/data/`. One **seeded `transactions` array
(500–2,000 rows)** is the spine; Dashboard, Accounts, Budgets, Cards, and Subscriptions all **derive** from
it via aggregation. Separate seeds: `accounts`, `cards`, `payees`, `scheduledPayments`, `instruments`
(+ price/OHLC series), `holdings`, `orders`, `watchlists`, `dividends`, `notifications`, `loans`
(+ amortization), `user`/`settings`, `rewards`, `insurance`, `crypto`. Deterministic seeding (a small seeded
PRNG, no `Math.random` at import time) so the demo is stable across reloads. Formatters in `src/lib/format.ts`
(extend the `formatPrice` pattern from tools). Money as integer minor units.

## State (rune-class singletons, gokberk-tools pattern)

Each a `*.svelte.ts` class exporting a singleton, `$state` fields, `browser`-guarded `localStorage`
persistence + cross-tab `storage` listener, `gok-`-prefixed keys: `theme`/`density` (copy
`density.svelte.ts`), `session` (mock login/lock), `accounts`, `transactions` (filters/sort/pagination
view-state), `cards`, `payments`, `portfolio`, `watchlists`, `budgets`, `notifications`, `settings`.
Mutations (transfers, trades, freeze card, create budget) update these stores so flows feel live within the
session.

## Surfaces (the full inventory)

**Shell & cross-cutting:** persistent nav (`gok-sidenav` desktop / bottom-tab mobile), top bar (search,
`gok-theme-switch`, notification bell, profile `gok-menu`), command-palette search, multi-currency switcher,
skeleton/empty/error states (`gok-skeleton`, `gok-empty-state`, `gok-alert`), `gok-toast-region`, mock auth
(login / lock / logout), View Transitions hook (copy from tools' `+layout.svelte`).

1. **Dashboard** — net worth, balance cards, spend summary, quick actions, upcoming bills, activity feed,
   portfolio snapshot, market mini-tickers; sparklines + net-worth chart.
2. **Accounts** — list + detail, balance-history chart, copyable IBAN/BIC, statements (mock),
   **Vaults/Pots/Goals** (progress rings, round-up, auto-save, goal form).
3. **Transactions** — *the `gok-table` showcase*: 500–2,000 rows, sort, faceted filters + chips, search,
   column toggles, density, row expand, detail drawer, category/tags/notes, split, export (mock),
   pending vs settled, running balance. `gok-table` `paginated`/`virtualized`, `selection-mode`, wired via
   `setProps` + `on('gok-sort'/'gok-selection-change'/'gok-page-change')`.
4. **Cards** — card carousel (physical/virtual/disposable), card visual hero, freeze toggle, limits
   (sliders), online/ATM/contactless toggles, PIN (mock), order virtual card flow, per-card stream,
   card-spend donut.
5. **Payments & Transfers** — *the form/wizard showcase*: send money multi-step wizard
   (recipient → amount → review → confirm → success), between-own-accounts, request/split bill,
   international/FX (rate + fee breakdown), scheduled & recurring (table), standing orders / direct debits,
   payees CRUD (table, mock IBAN validation), QR / payment link / top-up.
6. **Investments / Portfolio** — *heaviest table+chart combo*: holdings grid (dense numeric, color deltas,
   sparkline cells), allocation donut/treemap, performance chart w/ ranges + benchmark; instrument detail
   (**candlestick** price chart, key stats, order-book/depth, news, buy/sell); order ticket
   (market/limit/stop) wizard; orders & history table; watchlists (multiple, sparkline rows); funds/ETF
   explorer; dividends calendar + table; markets/discover (movers, indices, sector heatmap); performance/
   reports (P&L, tax lots).
7. **Budgets & Analytics** — spend-by-category donut/bar, monthly trend stacked bar, budget creation +
   progress, income vs expense, top merchants, subscription detector (table), cashflow forecast, MoM
   comparison, savings rate.
8. **Notifications / Activity** — notification center, read/unread, grouping, filters, per-type prefs,
   "instant spend" toast demo (Revolut signature).
9. **Profile & Settings** — personal details, security (2FA toggles, devices/sessions table), preferences
   (language, currency, theme, density), plan tier (Standard/Premium/Metal), KYC status, statements &
   documents (table), avatar uploader, support/help.
10. **Lending / Borrowing** — loans/mortgages overview + detail (amortization table, payoff chart),
    repayment, loan/mortgage calculator (sliders), overdraft, apply flow, credit-score widget.
11. **Stretch / showcase** — crypto wallet (holdings, price charts, buy/sell, activity), rewards/cashback,
    insurance (policies, claims table), shared/joint spaces, sustainability/carbon footprint, on-screen
    statement generator (print-CSS dogfood).

## Build order (later passes)

1. **Scaffold** — SvelteKit + TS; install `@gokberknur/design-system`, `lightweight-charts`, `echarts`; copy
   the verbatim template files; wire `gok.ts`, `standalone.css`, theme script, Vite `dedupe:['lit']`; copy
   `.github/workflows/ci.yml`, `.nvmrc`, `renovate.json`; write `CLAUDE.md` + `README.md`.
2. **Data + state foundation** — seeded mock-data layer, formatters, state singletons.
3. **Chart foundation** — `src/lib/charts/` wrappers + shared token-bridge `theme.ts` + `data-theme`
   observer.
4. **App shell** — layout, nav, top bar, theme/density, search, toasts, mock auth, view transitions.
5. **Surfaces** — build in inventory order, each verified against `verification.md` (light/dark/compact/
   states).
6. **Polish & dogfood pass** — empty/error/loading everywhere, responsive, a11y (`svelte-check` + axe),
   Playwright smoke tests, fill in `docs/dogfooding-findings.md`.

## Verification

- **Build/typecheck:** `npm run check` + `npm run build` green (CI gates).
- **Run it:** walk every surface in light/dark/compact; no flash-of-wrong-theme; `gok-table` renders
  500–2,000 rows with sort/filter/paginate; charts re-theme on toggle; wizards complete; mutations persist
  across reload + sync across tabs.
- **Visual/brand gate:** each surface against the `gokberk-design` `verification.md` rubric.
- **a11y:** `svelte-check` clean; axe spot-checks on table/wizards/overlays; keyboard nav.
- **Smoke tests:** Playwright suite (mirror tools' `test:e2e`), wired into CI.
- **Dogfood log:** `docs/dogfooding-findings.md` captures every DS gap/friction (bank-repo-only).
