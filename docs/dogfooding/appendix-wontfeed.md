# Appendix — findings intentionally NOT fed as DS work

For completeness, every dogfooding `#` is accounted for. These are deliberately excluded from the spec items,
with the reason — so the DS team doesn't re-triage them. [← README](README.md)

| `#` | Finding | Why not fed |
|----:|---------|-------------|
| 9 | `gok-progress` is determinate-only (no indeterminate mode) | **wontfix by design** — `gok-spinner` covers unknown-duration waits (per the DS `patterns.md`). The bank logged it as `wontfix`, not a gap. |
| 13 | `gok-segmented` is not a form control (selection only via `value` + `change`, no native form participation) | **wontfix by design** — fine for the facet/toggle role it fills; the bank never needed a `<form>`-bound segmented. Flag only if a form-bound segmented is ever required. |
| 10 | Cloudflare Pages build image defaults to Node 22, but the app needs `>=24` → `npm ci` `EBADENGINE` | **bank-infra, not DS** — resolved by pinning Node 24 via `.nvmrc`. Nothing for the design system to do. |

## Folded, not dropped

The three `MoneyInput` composite gaps are **not** filed as standalone bugs because they describe the bank's own
app-local composite, not a shipped DS element. They are **folded into [P1 `gok-money`](02-missing-primitives.md#p1--gok-money--currency--numeric-format-input)**
as acceptance criteria for the promoted component:

| `#` | Folded into |
|----:|-------------|
| 24 | P1 — `gok-money` needs a commit/blur callback distinct from per-keystroke change |
| 25 | P1 — `gok-money` needs an external `error` prop sharing the one message line |
| 26 | P1 — `gok-money` needs a controlled `value` that reflects external resets without a remount |

## Scope boundary noted (not a gap)

The brand **card-art** (`CardArt`) is intentionally app-local — it is brand object art that legitimately reaches
for *core* `--gok-*` colour tokens, not a DS control. Only the **carousel/strip mechanics** are fed, as
[P12](02-missing-primitives.md#p12--carousel--scroll-snap-strip-gok-carousel). This is a deliberate boundary,
recorded so it isn't mistaken for a missing component.
