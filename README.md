# gökberk bank

A personal banking + investing **demo** web app — Revolut feel, Nordnet depth, the breadth of a
traditional online bank. Frontend-only (mock/seeded data, no real backend or auth). Built with
**SvelteKit + Svelte 5**, composed from the published
[`@gokberknur/design-system`](https://www.npmjs.com/package/@gokberknur/design-system) — a second
flagship dogfooding consumer alongside `gokberk-tools`.

Live: **[bank.gokberk.se](https://bank.gokberk.se)**

> Status: scaffold (hello-world). The full surface inventory is planned in
> [`docs/PLAN.md`](docs/PLAN.md) and tracked in [`tasks/backlog.md`](tasks/backlog.md), built across
> multiple passes.

## Stack

- SvelteKit 2 · Svelte 5 (runes) · Vite · TypeScript
- `@sveltejs/adapter-static` → pure client SPA (`ssr=false`), deployed to Cloudflare Pages
- Node `>=24`

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm run build      # static build → ./build
npm run preview    # preview the production build
npm run check      # svelte-check (strict)
```
