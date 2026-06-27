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

- **wizard/stepper** (`gok-tabs activation="manual"` + `gok-progress format="fraction"` + own step-state) ·
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
