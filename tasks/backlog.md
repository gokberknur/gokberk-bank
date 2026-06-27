# gokberk-bank — backlog

Actionable tracker derived from [`docs/PLAN.md`](../docs/PLAN.md). Status: `[ ]` todo · `[~]` in progress ·
`[x]` done. Built in **multiple planning passes**; only `P0` (init) is approved so far — each later phase
gets its own planning + approval before code.

---

## P0 — Repo init  `[~]`

- [x] Create `~/Desktop/personal/gokberk-bank` + `git init`
- [x] Commit the plan (`docs/PLAN.md`) and this backlog
- [ ] First commit pushed / repo confirmed

## P1 — Scaffold  `[ ]`  _(needs its own planning pass)_

- [ ] SvelteKit 2 + Svelte 5 + Vite 8 + TS project (adapter-static, `ssr=false`, `fallback: index.html`)
- [ ] Install `@gokberknur/design-system`, `lightweight-charts`, `echarts`
- [ ] Copy verbatim from gokberk-tools: `wc.svelte.ts`, `app.html`, `+layout.ts`, `svelte.config.js`,
      `vite.config.ts` (`dedupe:['lit']`), `app.d.ts`, `tsconfig.json`, `.nvmrc`, `ci.yml`,
      `state/density.svelte.ts`
- [ ] `gok.ts` registration barrel (trimmed to elements used)
- [ ] `standalone.css` import + pre-paint theme/density script wired
- [ ] `CLAUDE.md` (two-authorities convention) + `README.md` + `renovate.json`
- [ ] `npm run check` + `npm run build` green

## P2 — Data + state foundation  `[ ]`

- [ ] Seeded mock-data layer (`src/lib/data/`): `transactions` spine (500–2,000 rows, deterministic PRNG)
- [ ] Derived seeds: accounts, cards, payees, scheduledPayments, instruments(+OHLC), holdings, orders,
      watchlists, dividends, notifications, loans(+amortization), user/settings, rewards, insurance, crypto
- [ ] `src/lib/format.ts` (currency/number/date; money as integer minor units)
- [ ] State singletons (`src/lib/state/*.svelte.ts`): theme/density, session, accounts, transactions,
      cards, payments, portfolio, watchlists, budgets, notifications, settings

## P3 — Chart foundation  `[ ]`

- [ ] Shared token-bridge `src/lib/charts/theme.ts` + `data-theme` MutationObserver
- [ ] ECharts wrappers: Line, Area, Sparkline, Donut, Bar/StackedBar, Treemap/Heatmap
- [ ] Lightweight Charts wrapper: Candlestick/Price (with attribution)
- [ ] Log "DS has no chart primitive" in `docs/dogfooding-findings.md`

## P4 — App shell  `[ ]`

- [ ] Root layout, `gok-sidenav` (desktop) / bottom-tab (mobile)
- [ ] Top bar: search, `gok-theme-switch`, notification bell, profile `gok-menu`
- [ ] Command-palette search, multi-currency switcher
- [ ] Skeleton / empty / error states, `gok-toast-region`
- [ ] Mock auth (login / lock / logout), View Transitions hook

## P5 — Surfaces  `[ ]`  _(build in order; each verified light/dark/compact)_

- [ ] 1. Dashboard
- [ ] 2. Accounts (+ Vaults/Pots/Goals)
- [ ] 3. Transactions — `gok-table` showcase
- [ ] 4. Cards
- [ ] 5. Payments & Transfers — wizard showcase
- [ ] 6. Investments / Portfolio — heaviest table+chart combo
- [ ] 7. Budgets & Analytics
- [ ] 8. Notifications / Activity
- [ ] 9. Profile & Settings
- [ ] 10. Lending / Borrowing
- [ ] 11. Stretch — crypto, rewards, insurance, shared spaces, carbon, statement generator

## P6 — Polish & dogfood pass  `[ ]`

- [ ] Empty/error/loading everywhere; responsive (sidebar ↔ bottom-tab)
- [ ] a11y: `svelte-check` clean, axe spot-checks, keyboard nav
- [ ] Playwright smoke suite + CI wiring
- [ ] `docs/dogfooding-findings.md` complete
- [ ] Deploy → `bank.gokberk.se`

---

## Open decisions

- **Charting default:** Lightweight Charts + ECharts (maturity + coverage) vs Lightweight Charts +
  LayerChart (native `var(--gok-*)`, pre-1.0). Default = the former unless changed.
