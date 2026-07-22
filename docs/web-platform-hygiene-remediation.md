# Web-platform hygiene remediation — spec

**Objective.** Bring the app's raw web-platform layer (security headers, resource hints, HTML
semantics, form/bundle hygiene) up to current best practice, verified against the `modern-web-guidance`
corpus (performance/CWV, HTML, CSS, accessibility, security/privacy, forms). Source: a full-repo scan run
2026-07-22 — parallel research passes over every `.svelte`/`.ts` file under `src/`, each finding confirmed
by direct `grep`/`Read`, not inferred. Follows the batch-ordered-checklist convention established in
`docs/assessment-v1-remediation.md`. This is a **hygiene pass**, not a feature — no domain scope, no UX
redesign, no `.planning/` spec required per finding; item 10 is the one exception (routes to
`gok-bank-identity`/`gok-bank-ux`, see Boundaries).

**Already clean — do not re-audit.** The scan explicitly ruled these out; re-flagging them later means
someone forgot this doc exists:
- No hand-rolled modals/overlays anywhere — every dialog/drawer wraps `gok-dialog`/`gok-drawer`.
- No positive `tabindex`, no inline string event-handler attributes, no `role="presentation"`/misapplied
  `aria-hidden` on focusable elements.
- Zero `<img>` elements in the whole app (fully SVG/icon/`gok-*`-driven) — no missing-`alt`/image-CLS surface.
- Zero `{@html}` usage — no XSS injection vector via that API.
- No hardcoded API keys/secrets; `.env*` handling in `.gitignore` is correct.
- `autocomplete`/`inputmode`/`type` tokens are already correct across every login/register/forgot-password/
  onboarding/payments form — including the non-obvious `autocomplete="username"` for email-as-identifier
  on sign-in. `payments/payees/new`'s `autocomplete="off"` is correct there (third-party data, not the
  user's own).
- `lightweight-charts` is already dynamic-imported correctly (`PriceChart.svelte:578`, inside `onMount`,
  only type-imports at module scope).
- No `manualChunks`/barrel-file bundling issue — `src/lib/index.ts` is empty, nothing forces a shared chunk.
- Fonts are fully design-system-owned — no app-level `@font-face`/font `<link>` to audit.
- No `setInterval`/`setTimeout` cleanup leaks (`exchange.svelte.ts` clock correctly tears down in `$effect`).

---

## P0 — Security (cheap, do first)

### 1. No Cloudflare Pages `_headers` file
**Finding.** Zero `_headers` file anywhere (`static/`, `build/`, root). No CSP, `X-Frame-Options`/
`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options` on a public,
GitHub-connected, auto-deploying app (`bank.gokberk.se`).

**Fix.** Add `static/_headers` (Cloudflare Pages reads this file verbatim from the publish dir; adapter-static
copies `static/` into `build/`). Baseline for a pure client SPA that loads `@gokberknur/design-system` from
npm/CDN-bundled and fetches live data from exactly two external hosts:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.frankfurter.dev https://data-api.binance.vision; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'
```
`style-src 'unsafe-inline'` is required because `gok-*` Lit components set inline styles on their shadow
roots — tightening this further would need a design-system-side nonce/hash strategy, out of scope here.

`script-src 'unsafe-inline'` turned out to be required too (**caught via a real Cloudflare Pages preview
deploy going blank** — see the correction note below): `src/app.html` ships two inline `<script>` blocks —
the theme-flash-prevention snippet and SvelteKit's own client hydration bootstrap (which embeds a
build-specific payload/identifier that changes every build). A hash-based CSP would need those hashes
regenerated on every single deploy via a build step that doesn't exist today; that's a real follow-up worth
doing (Cloudflare Pages Functions could inject a per-response nonce, or a small postbuild script could
compute and write the two hashes into `_headers`), but out of scope for this pass. `'unsafe-inline'` on
`script-src` is the pragmatic, working baseline — CSP still meaningfully restricts `connect-src` (only the
two live-data hosts), blocks framing (`frame-ancestors 'none'`), and blocks loading scripts from any
non-self origin, which covers the actual threat model for an app with zero `{@html}` usage and no
user-generated content ever rendered as markup.

**Acceptance criteria.** `curl -I` on the deployed origin shows all five headers; loading the app on a real
Cloudflare Pages preview deploy renders (not blank) with zero CSP console violations; full click-through of
accounts/payments/cards/invest/crypto routes (including a live FX convert and a crypto quote, to exercise
the two allow-listed `connect-src` hosts) shows no further violations.

**Correction (2026-07-22, post-merge-review).** The first version of this fix shipped `script-src 'self'`
(no `'unsafe-inline'`), reasoning by analogy from the `style-src` case without actually checking `app.html`
for inline scripts. That shipped a blank-page regression on the PR's Cloudflare Pages preview deploy — caught
by re-checking the live preview in a real browser (`chrome-devtools` MCP), which showed two CSP console
errors naming the exact two blocked inline scripts. Fixed by adding `'unsafe-inline'` to `script-src` too.
Lesson: **a CSP change against a real app must be verified against a real deployed preview, in a real
browser, before calling it done** — `curl -I` only proves the header shape, not that the page still runs.

**Owner.** Direct code fix, no sign-off needed — infra/hygiene, not product surface.

### 2. Onboarding KYC-shaped draft persisted in plaintext `localStorage` with no expiry
**Finding.** `src/lib/onboarding/onboarding.svelte.ts:339` (`#persistDraft`) JSON-stringifies the full
`OnboardingData` snapshot — `fullName`, `dob`, `residency`, `idType` (see the interface at line 40 and
`src/lib/onboarding/kyc.ts`) — into `localStorage` under `DRAFT_KEY`, cleared only on `restart()` or
flow completion. No TTL.

**Fix.** Add a TTL check on read (e.g. reject/clear drafts older than 24h — stamp a `savedAt` alongside
`currentIndex`/`data`) so a stale draft doesn't sit in a shared/public machine's storage indefinitely. Confirm
via `kyc.ts` that no selfie/ID-photo binary data ever enters the persisted snapshot (current review found
none — `runOcr` only takes/returns strings, no image data) — add a one-line comment at the call site
documenting that constraint so a future OCR upgrade doesn't accidentally start persisting binary ID/selfie
data through the same path.

**Acceptance criteria.** Reloading the onboarding flow after simulating a 24h+ old `savedAt` starts fresh
instead of resuming; a code comment at `kyc.ts`'s OCR boundary states the no-binary-data constraint.

**Owner.** Direct code fix. Low severity (mock data, no real backend per CLAUDE.md) — do without a
domain-expert gate, but mention it to `gok-bank-identity` in passing since it's their surface.

---

## P1 — Performance

### 3. No `preconnect`/`dns-prefetch` for live market-data hosts
**Finding.** `src/app.html` has zero resource hints. The app fetches live data directly from the browser
at `api.frankfurter.dev` (`src/lib/market/providers/frankfurter.ts:9`) and `data-api.binance.vision`
(`src/lib/market/providers/binance.ts:10`) — as a pure client SPA there's no server-side critical path, so
a cold DNS+TLS handshake to these hosts adds latency directly to the interaction the user is waiting on
(opening an FX-convert screen or a crypto instrument page).

**Fix.** In `src/app.html` `<head>`, after the existing `<meta>` tags:
```html
<link rel="preconnect" href="https://api.frankfurter.dev" crossorigin />
<link rel="preconnect" href="https://data-api.binance.vision" crossorigin />
```
(Use `preconnect`, not `dns-prefetch` — only two hosts, both hit on a real, common path, so the fuller
handshake is worth it per the "Preconnect for domains" heuristic.)

**Acceptance criteria.** Network panel on a cold load of `/payments/exchange` or `/crypto/[symbol]` shows
the TLS handshake to the relevant host starting at/near navigation start rather than at first-fetch time.

**Owner.** Direct code fix.

### 4. `layerchart` eagerly imported in 4 wrappers vs. `lightweight-charts`'s correct lazy pattern
**Status: verified, no code change needed (closed 2026-07-22).** `DonutChart.svelte:8`, `LineChart.svelte:10`,
`PayoffChart.svelte:11`, `StackedBar.svelte:8` statically `import` from `layerchart` at module top level —
ran `npm run build` and inspected `build/_app/immutable/`: the shared chart chunk (`chunks/DLi1ivBh.js`,
which bundles `layerchart` + its shared dependencies) is only referenced from the ~10 route `nodes/*.js`
files that actually render a chart component (invest, invest/instrument, invest/plans, crypto, lending
payoff, budgets, home, accounts overview, etc.) — it does **not** appear in `nodes/0.*.js` (the root
layout, loaded on every route) or in the client entry's eager-load path. SvelteKit's route-based splitting
already isolates it correctly; no dynamic-import conversion needed.

### 5. Unbounded activity feed, no `content-visibility`
**Finding.** `src/lib/components/activity/ActivityFeed.svelte:13-22` (style block 25-48) renders the full
transaction history via nested `{#each groups}...{#each group.events}` with no `content-visibility: auto`
and no pagination in `src/lib/state/feed.svelte.ts`. `src/lib/data/transactions.ts:12`'s
`WINDOW_MONTHS = 14` means real accounts can generate a non-trivial row count rendered unconditionally.

**Fix.** Add to the day-group row style:
```css
.day {
  content-visibility: auto;
  contain-intrinsic-size: auto 320px; /* tune to actual average day-group rendered height */
}
```
Measure one representative rendered `.day` block's height first and use that as the intrinsic-size estimate
to avoid scrollbar jumping.

**Acceptance criteria.** Scrolling a heavy-activity account's feed shows no visible jank (Performance panel:
no long layout/paint tasks for off-screen day-groups); no visible content jump when `content-visibility`
switches a group in/out of the viewport.

**Owner.** Direct code fix.

---

## P1 — Accessibility / HTML semantics

### 6. Two detail routes have no `<h1>` at all
**Status: fixed for `cards/[id]`; `invest/plans/[id]` was a stale finding (closed 2026-07-22).**
`src/routes/(app)/cards/[id]/+page.svelte` genuinely had no `<h1>` (heading tree started at
`<h2 id="spend-heading">` line 228; the card identity was only a non-heading `<p class="hero-eyebrow">`)
— fixed by adding a visually-hidden `<h1 id="card-heading">` (e.g. "Physical card ending in 4242"),
matching the `home/+page.svelte:34` convention.

`src/routes/(app)/invest/plans/[id]/+page.svelte` turned out to already render one `<h1>` — via the shared
`PageHeader` composite (`src/lib/components/layout/PageHeader.svelte:35`, `<h1 class="ph-title …">{title}</h1>`,
fed `title={plan.name}` from this route). The original scan missed this because the `<h1>` lives in a
shared composite, not inline in the route file. No fix applied — adding a second hidden `<h1>` here would
have created a duplicate-H1 defect, the exact thing this item exists to prevent.

### 7. `invest/+page.svelte`'s `<h1>` is a bare monetary figure
**Finding.** `src/routes/(app)/invest/+page.svelte:221` — `<h1>{totalValue}</h1>` (e.g. "€12,450.32"), with
the actual page label "Portfolio" as a non-heading `<p class="head-eyebrow">` at line 220.

**Fix.** Copy the `home/+page.svelte:34-42` split exactly: visually-hidden `<h1>Portfolio</h1>`, separate
`<h2>` (or existing element) carries the number.

**Acceptance criteria.** Screen-reader page-title announcement on `/invest` says "Portfolio", not a
currency figure.

### 8. Three clickable `<tr>` rows without their own keyboard affordance
**Finding.** `src/routes/(app)/invest/+page.svelte:489`, `src/lib/components/invest/WatchTable.svelte:128`,
`src/lib/components/invest/InstrumentGrid.svelte:228` — `<tr onclick={...}>` with no `role`/`tabindex`/
`onkeydown` of its own. Each row already contains a real `<a class="sym-link">` to the same destination
with `stopPropagation`, so keyboard users have a full alternate path today.

**Fix.** Low severity, mitigated — no forced fix. Either (a) leave as-is and add a one-line comment noting
the nested `<a>` is the intentional keyboard path, or (b) if touch/mouse users should get full-row click
parity with keyboard, wrap with the row-activate pattern (`[[gok-table row-activate]]`-equivalent) — check
whether the design system's row-activate event (already used elsewhere per project memory) fits these three
custom (non-`gok-table`) tables before hand-rolling `role="link"` + `tabindex="0"` + `onkeydown`.

**Acceptance criteria.** Either the explanatory comment is added (option a), or all 3 rows are independently
keyboard-activatable with visible focus (option b).

**Owner.** Direct code fix; pick (a) unless a fast row-activate composite already exists to reuse.

### 9. Inconsistent label convention across 3 hand-built comboboxes
**Finding.** `src/routes/(app)/payments/split/+page.svelte:271-288` shows a visible `<label>`, while
`src/lib/components/invest/AddInstruments.svelte:132-147` and
`src/lib/components/invest/DiscoverSearch.svelte:112-136` use a `visually-hidden` label + placeholder-only
visible text.

**Fix.** Normalize to one convention app-wide. Recommend visible label (matches `split`'s existing pattern,
and the modern-web-guidance forms corpus explicitly discourages placeholder-as-label).

**Acceptance criteria.** All 3 composites render a visible field label with consistent markup/spacing.

**Owner.** Direct code fix.

---

## P2 — Tooling / consistency (decision needed first)

### 10. Register form asks for password twice
**Finding.** `src/routes/register/+page.svelte:97-115` — password + confirm-password fields. Named
anti-pattern in the modern-web-guidance forms corpus (prefer a show/hide toggle over a duplicate confirm
field).

**Not an auto-fix.** This is a flow/UX call, not a missing-attribute bug. **Route to `gok-bank-identity` +
`gok-bank-ux` before touching code** — confirm-password is a defensible, common pattern for account-opening
flows specifically (typo-prevention at the one moment there's no existing session to recover from); the
guidance's objection may not outweigh that here. Do not change without their sign-off.

### 11. No ESLint or Prettier config in the repo
**Finding.** Confirmed absent at repo root (no `.eslintrc*`, `eslint.config.*`, `.prettierrc*`) despite 183
`.svelte` + 146 `.ts`/`.js` files. Only `svelte-check` enforces anything today.

**Not an auto-fix — decision point.** Adding lint/format tooling is a standing team-workflow choice, not a
bug fix; it touches every contributor's local setup and CI. Options to put to the user/team:
  - (a) Add a minimal flat-config `eslint.config.js` with `typescript-eslint` + `eslint-plugin-svelte`, plus
    a `.prettierrc` matching the existing tab-indentation style visible in `package.json`/`tsconfig.json`.
  - (b) Explicitly decide to rely on `svelte-check` + editor formatting only, and note that decision
    somewhere durable (this doc or CLAUDE.md) so it isn't re-flagged as an oversight later.

**Acceptance criteria.** Either (a) `npm run check` gains a lint step and a first lint-clean commit lands,
or (b) a one-line decision record is added stating this was a deliberate choice.

---

## P3 — Optional hardening / cosmetic

### 12. `tsconfig.json` headroom
**Finding.** `strict: true` is set; `noUncheckedIndexedAccess`, `noImplicitOverride`, and
`verbatimModuleSyntax` are not. Optional stronger type-safety, not urgent.

**Fix.** Add the three flags one at a time (each can surface a wave of new `svelte-check` errors) — do this
as its own small commit per flag, not bundled with anything else in this doc, so any fallout is easy to
bisect.

### 13. Print stylesheet hardcodes hex under `@media print`
**Finding.** `src/routes/(app)/accounts/[id]/statements/+page.svelte:656-692` — `#1a1a1a`, `#ffffff`,
`#555555`, `#cccccc`, repeated 7 times. **Already justified** (existing comment: ink-on-paper needs fixed
colors regardless of on-screen theme) — not a CLAUDE.md brand-rule violation, just unexpressed as tokens.

**Fix.** Define `--print-ink`, `--print-paper`, `--print-muted`, `--print-rule` once (scoped to this file;
deliberately **not** `--gok-*`-prefixed, since `scripts/check-tokens.mjs` validates every `--gok-*` custom
property against the design-system's real token manifest and would reject an app-local one-off under that
prefix) and reference those instead of raw hex — purely so a future reader doesn't mistake this for an
accidental violation.

**Acceptance criteria.** Printed statement is visually identical; hex values appear exactly once each, in
custom-property definitions.

---

## Execution order

1. **P0** (items 1–2) — cheap, no dependencies, do first.
2. **P1 performance** (items 3–5) — independent of each other; item 4 requires a build-inspection step
   before any code changes.
3. **P1 accessibility** (items 6–9) — independent, can go in parallel with performance.
4. **P2** (items 10–11) — **stop and get sign-off** before writing code (identity/UX for item 10; team
   decision for item 11).
5. **P3** (items 12–13) — do last, each as its own isolated commit.

Each shipped item should get its own commit (matching this repo's existing granular-commit convention);
no single mega-commit for the whole pass.
