# Dogfooding findings

Friction and gaps found while building gökberk bank against `@gokberknur/design-system`. **Bank-repo only** —
this log is the feedback loop; it is not (yet) filed into the design-system backlog. Each item: what we hit,
where, and how we worked around it.

Status: `open` (worked around app-locally) · `resolved` (DS shipped a fix) · `wontfix` (intentional).

## Component gaps (no `gok-*` element exists)

These are filled by app-local composites under `src/lib/components/` (see `.planning/features/foundations/`
and ADR-004). Building each is a vote for a future DS primitive.

| # | Gap | Hit by | Workaround | Status |
|---|-----|--------|------------|--------|
| 1 | **No chart primitive** (line/area/sparkline/donut/bar/candlestick) | Dashboard, accounts, portfolio, budgets, lending | TradingView Lightweight Charts + ECharts + `--gok-*` token bridge (F11, ADR-002) | open |
| 2 | **No stepper/wizard** | Every application/transfer flow | Compose `gok-tabs activation="manual"` + `gok-progress format="fraction"` + app step-state (F05) | open |
| 3 | **No date / date-range picker** (`gok-input` has no `date` type) | Onboarding DOB, scheduled payments, statements, insurance, claims | Calendar popover composite over `gok-input` + `gok-popover` (F06) | open |
| 4 | **No money/currency input** | Every amount field | `gok-input type=number` + affix slot + locale formatting + minor units (F07) | open |
| 5 | **No OTP / one-time-code input** | 2FA, step-up, PIN, 3-DS, e-sign | Segmented OTP composite (F08) | open |
| 6 | **No file-upload / dropzone** | KYC, claims, mortgage docs, disputes, support | Dropzone composite + `gok-progress` (F09) | open |
| 7 | **No free-text-filtering combobox / multi-select** | Payee & instrument search, split-bill people, watchlists, region allow-lists | Combobox + multi-select composites (F10). NOTE: native `gok-select` *does* ship keyboard typeahead and covers small single-value sets — only filtering/multi need composites | open |

## Component-API friction

| # | Where | Finding | Workaround | Status |
|---|-------|---------|------------|--------|
| 8 | `gok-table` | `column.format(value, row)` returns a display **string**, so inline **sparkline cells** / custom cell renderers aren't first-class. Hit when designing portfolio/watchlist rows with mini-charts (V01, V05). | Render sparklines outside the grid, or a dedicated column slot if/when supported; revisit cell-renderer API | open |
| 9 | `gok-progress` | Determinate-only — no indeterminate mode. | Use `gok-spinner` for unknown-duration waits (per patterns.md) | wontfix (by design) |

## Build/infra notes

| # | Finding | Resolution | Status |
|---|---------|------------|--------|
| 10 | Cloudflare Pages build image defaults to **Node 22**, but the app requires `>=24` (engine-strict) → `npm ci` failed `EBADENGINE`. | Pin Node 24 via `.nvmrc` (Pages reads it). | resolved |

---

_Add a row when you hit new friction; promote items to the design-system backlog later if a pattern proves
broadly reusable._
