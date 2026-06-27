# gokberk-bank — backlog

Actionable tracker derived from [`docs/PLAN.md`](../docs/PLAN.md). Status: `[ ]` todo · `[~]` in progress ·
`[x]` done. Built in **multiple planning passes**; only `P0` (init) is approved so far — each later phase
gets its own planning + approval before code.

---

## P0 — Repo init + hello-world + deploy  `[x]`

- [x] Create `~/Desktop/personal/gokberk-bank` + `git init`
- [x] Commit the plan (`docs/PLAN.md`) and this backlog
- [x] Scaffold SvelteKit (Svelte 5, adapter-static SPA, `ssr=false`) hello-world; `npm run build` green
- [x] Push to GitHub: `github.com/gokberknur/gokberk-bank` (public)
- [x] Cloudflare Pages project `gokberk-bank` (GitHub-connected, build `npm run build` → `build`,
      `.nvmrc` pins Node 24) — **auto-deploys on push to `main`**, confirmed
- [x] Live: `gokberk-bank.pages.dev` (HTTP 200) · custom domain `bank.gokberk.se` added + DNS CNAME
      (proxied), SSL provisioning

## P1 — Scaffold the real app shape  `[ ]`  _(needs its own planning pass)_

- [ ] Install `@gokberknur/design-system`, `lightweight-charts`, `echarts`
- [ ] Copy verbatim from gokberk-tools: `wc.svelte.ts`, `app.html` (pre-paint theme script),
      `state/density.svelte.ts`, `app.d.ts` (`SVGAttributes.slot` patch); adapt `+layout.svelte`
- [ ] `gok.ts` registration barrel (trimmed to elements used) + `standalone.css` import
- [ ] `CLAUDE.md` (two-authorities convention) + `renovate.json` + CI (`ci.yml`)
- [ ] `npm run check` green

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
