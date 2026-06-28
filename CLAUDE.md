# CLAUDE.md

Guidance for working in this repo.

## What this is

**gökberk bank** — a personal **banking + investing demo** web app built with **SvelteKit**, and the
second flagship **consumer / dogfooding** app for the
[`@gokberknur/design-system`](https://www.npmjs.com/package/@gokberknur/design-system) package (alongside
`gokberk-tools`). Every screen is composed from `gok-*` web components and `--gok-*` tokens. Live at
`bank.gokberk.se`. This repo is **public**; the design-system *source* repo is private (only its built
`dist/` is on npm).

It is a **pan-European multi-currency** neobank (EUR home + FX wallets, SEPA / SEPA Instant + SWIFT, IBAN,
email + 2FA/passkey, EU KYC, vaults, disposable cards, premium tiers) covering accounts, payments,
transfers, cards, loans, mortgages, insurance, investments, documents, and more.

It is a pure client **SPA** (`adapter-static`, `ssr = false` in `src/routes/+layout.ts`) because the `gok-*`
elements are web components that register and render in the browser. **No real backend, no real auth, no real
money or PII** — all data is mock/seeded and deterministic.

## The `.planning/` system (read before you build)

Specs, the backlog, and UX flows live in a **local-only, git-ignored** `.planning/` folder (not in this
public repo). **Read the feature's spec under `.planning/features/<domain>/` before building it**, and keep
`.planning/backlog.md` in sync **in the same change** as the work. The macro picture is
`.planning/overview.md`; route map, journey flows, and reusable patterns are under `.planning/ux/`. If
`.planning/` isn't present on your machine, ask for it — do not invent scope.

## Two authorities

1. **Svelte MCP governs how the code is written.** Author and edit **every** `.svelte` / `.svelte.ts` /
   `.svelte.js` file through the Svelte MCP (the `svelte:svelte-file-editor` agent): it pulls current
   Svelte 5 docs and runs the autofixer, re-checking after each change. Do **not** hand-write Svelte from
   memory — Svelte 5 runes + web-component interop have sharp edges.
2. **The `gokberk-design` skill governs how it looks and reads.** Compose every route against its
   `patterns.md`, `brand-language.md`, `voice-and-tone.md`; hold it against `verification.md` before calling
   it done.

## The expert layer (domain experts · UX · product owner)

On top of the two authorities sits a **team of expert skills** under `.claude/skills/` that governs *what*
we build, *how it's experienced*, and *whether it earns its place*. They are advisory experts — they don't
write code or pick colours; they lend judgment. Consult the relevant ones **before and while** building a
feature; they auto-trigger from their descriptions, and the `expert-reminder.sh` PostToolUse hook nudges the
right ones when you edit a domain's files.

Each domain skill is organized as a **selection router**: its SKILL.md + a cross-cutting reference set
(customer requirements, regulatory/trust, benchmarks, scope, definition-of-done) give the domain-wide lens,
and **sub-area playbooks** under `references/` carry the deep per-surface mechanics (e.g. payments →
`sending-and-rails`, `fx-exchange`, `recurring-and-mandates`, `collecting-and-payees`). Read the cross-cutting
refs for the lens; read the playbook that matches the surface you're building.

**Domain experts** (each a 20+-year head of that domain; owns its features + scope):

| Skill | Domain / routes | Specs |
|-------|------------------|-------|
| `gok-bank-accounts` | accounts, wallets, balances, transactions table, pots, statements · `/accounts/**`, `/home` | A01–A06 |
| `gok-bank-payments` | send money, SEPA/SWIFT/FX, scheduled, direct debits, payees, split · `/payments/**` | P01–P10 |
| `gok-bank-cards` | card wallet, controls, limits, PIN/3-DS, add-to-wallet · `/cards/**` | C01–C05 |
| `gok-bank-lending` | loans, mortgages, credit line, amortization · `/lending/**` | L01–L05 |
| `gok-bank-insurance` | buy/quote, policies, claims · `/insurance/**` | N01–N03 |
| `gok-bank-wealth` | portfolio, order ticket, instruments, watchlists, crypto · `/invest/**`, `/crypto/**` | V01–V07 |
| `gok-bank-money` | budgets, spend analytics, rewards · `/budgets/**`, `/rewards/**` | M01–M02 |
| `gok-bank-identity` | onboarding, KYC, auth, 2FA/passkey, step-up, security · `/onboarding/**`, `/login`, `/security/**` | O01–O03 |
| `gok-bank-servicing` | documents vault, e-sign, support, disputes · `/documents/**`, `/support/**` | D01–D02, S01–S02 |

**Cross-cutting:**
- **`gok-bank-ux`** — the principal UX consultant: customer journeys, flow optimization, friction, states,
  flow-level a11y. Owns the experience, **not** brand visuals (those stay with `gokberk-design`). Cites and
  enforces `.planning/ux/patterns.md` + `ux-flows.md`.
- **`gok-bank-product-owner`** — the Chief Product Owner: the value/competitive **gate** with veto rights.
  Bring it in for any new feature, scope change, "should we build X", prioritization, or definition-of-done.

**External assessment consultants** (independent reviewers of the *built* app — they assess, never build;
findings land in git-ignored `assessmentv1/<domain>/` routed to the owning domain expert + `gok-bank-product-owner`):
- **`gok-bank-qa`** — the external QA / SDET lead. Tests UI **and** functionality inside-out: regressions,
  functional / UI-visual / state-coverage / console / navigation / data-integrity (minor-units) defects.
  Proves every finding in a real browser (drives `playwright-cli` + chrome-devtools MCP) and owns the
  **committed `e2e/` suite**. Finds & proves defects — it does **not** design, judge ergonomics, or decide ship.
- **`gok-bank-ux-audit`** — the external usability auditor (Nielsen-Norman style). Grades the *ergonomics*
  of the built result: primary-action reachability (visible vs scroll-hunted vs thumb-zone), task effort
  (steps/clicks to complete the job), scroll burden, consistency, guarded destructive actions. Distinct
  from `gok-bank-ux` — it audits the built journey and hands redesigns *to* it; it does **not** design,
  find functional bugs (that's `gok-bank-qa`), or pick visuals.

**Collaboration order (the council)** — for any feature work:
1. **Domain expert** sets requirements + guardrails (what must ship, what not, regulatory/edge cases) from
   the feature's `.planning` spec.
2. **`gok-bank-ux`** designs/optimizes the customer journey & flow on top.
3. **`gok-bank-product-owner`** validates value & competitiveness and gates ship/cut/reshape.

These compose *with* the two authorities above (Svelte MCP = how it's written, `gokberk-design` = how it
looks) — never override them. Platform/foundation work (no single domain owner) → `gok-bank-ux` +
`gok-bank-product-owner` + any touched domain expert.

## Brand discipline (non-negotiable)

- **Never hardcode** a hex, px, radius, or easing curve — read a `--gok-*` token (a *semantic role*:
  `--gok-color-text`/`-surface`/`-primary`/`-border`, `--gok-space-*`, …). This is what makes light/dark,
  density, and AAA contrast work for free.
- **Build with `gok-*` components first.** Drop to raw tokens + HTML only when no component fits.
- Monochrome canvas; the **forest-green accent is spent once per context** (primary action / selected /
  focus / link). Hairline + flat — **no shadow as a border**, no shadowed resting surfaces.
- The **mono uppercase eyebrow** is the one intentional uppercase. Left-aligned, **sentence-case** copy.
  **Status by rule + icon + text, never colour alone.** Numerals for everything in UI. Logical CSS properties.
- **Money & sensitive flows:** calm, plain, **no-blame** copy (errors say what happened + what to do);
  irreversible money actions end on a **forced-decision** `gok-dialog tone="danger" no-dismiss`; low-stakes
  reversible actions use optimistic update + `gok-toast` with undo. Disclose every fee/rate before confirm.

## Web-component ↔ Svelte interop (the tricky part — `src/lib/wc.svelte.ts`)

- **Registration is client-only.** `src/lib/gok.ts` imports the per-element side-effect subpaths
  (`@gokberknur/design-system/gok-button`, …); imported once from the root `+layout.svelte`.
- **Objects/arrays must be set as DOM *properties*, not attributes.** For `gok-table`'s `columns`/`rows`
  (and any object/array prop) assign the property via the `setProps` attachment in `src/lib/wc.svelte.ts`.
- **Hyphenated custom events** (`gok-page-change`, `gok-selection-change`, `gok-sort`, `gok-close`,
  `gok-cancel`, `change`, …): attach with `addEventListener` via the `on` attachment, not framework sugar.
- **No `bind:value`** on custom elements — read values from `change`/`input` events, set back explicitly.
- Slots into shadow DOM (`slot="icon"`, `slot="footer"`, …) work with plain `slot="…"`. The `app.d.ts`
  `SVGAttributes.slot` patch keeps `<svg slot="…">` green under svelte-check.

## Gap-composites & charts (app-local, never restyle the DS)

The design system lacks a few things a premium bank needs. Build these **app-local** under
`src/lib/components/` (and `src/lib/charts/`) — they compose `gok-*` + tokens; they **never** restyle DS
component visuals. DS gaps stay app-local; dogfooding findings → **this repo only**
(`docs/dogfooding-findings.md`), not the design-system backlog.

- **wizard/stepper** (purpose-built `<nav><ol>` step rail + `gok-progress format="fraction"` + own step-state
  — deliberately **not** `gok-tabs`, which models free non-linear nav while a wizard is forward-gated; the
  shared `WizardProgress` carries the "Step k of N" + `gok-progress` signal for non-composite step machines) ·
  **date / date-range picker** · **money/currency input** · **OTP input** · **file-upload/dropzone** ·
  **combobox/autocomplete** (free-text filter) + **multi-select** (native `gok-select` already does
  type-to-jump typeahead for small single-value sets — only filtering/multi need composites).
- **Charts:** **TradingView Lightweight Charts** (candlestick/price) + **Apache ECharts** (everything else),
  thin wrappers under `src/lib/charts/`, sharing one `--gok-*` **token-bridge** (`charts/theme.ts`) that
  re-themes on a `data-theme` MutationObserver. No chart logic in routes.

## Market model

EUR home + multi-currency wallets/FX · SEPA / SEPA Instant domestic, SEPA Direct Debit + standing orders ·
SWIFT international with charge options (OUR/SHA/BEN) · IBAN + BIC · email + 2FA (OTP) + passkey (WebAuthn
sim) + step-up re-auth · EU KYC (ID + selfie) · vaults/pots, physical/virtual/disposable cards, tiers
(Standard/Plus/Metal) · money as integer **minor units**; available vs current balance always distinguished.

## Dependency modes

- **Prod / clone / CI:** depends on `@gokberknur/design-system` from npm (`^0.4.x`, Renovate-kept). The
  deployed app may only use **published** APIs.
- **Local dogfooding:** `npm link` the local design system (`resolve.dedupe: ['lit']` handles Lit
  duplication). Work that uses unpublished components stays on a feature branch until the matching release
  ships.

## Deployment

`adapter-static` → `build/`, deployed to **Cloudflare Pages** (GitHub-connected, **auto-deploys on push to
`main`**). Node pinned to **24** via `.nvmrc` (the Pages build image defaults to 22).

## Commands

```bash
npm run dev / build / preview / check
```
