# Reporting format — the findings schema and the routing map

Every usability finding is filed into `assessmentv1/<domain>/ux-findings.md` using the schema below, so the
owning team and the CPO can act. Screenshots (desktop + mobile) go in `assessmentv1/<domain>/screenshots/`.
The `assessmentv1/index.md` rollup aggregates counts across all domains — keep your per-domain file
accurate and the rollup reconciles. This mirrors the QA reporting format so the index can total both lenses
the same way.

## Where findings live

```
assessmentv1/
  index.md                 # CPO rollup — counts per domain × severity, top friction
  <domain>/
    ux-findings.md         # yours
    qa-findings.md         # gok-bank-qa's
    screenshots/<ID>.png   # your evidence (desktop + mobile)
```

`assessmentv1/` is **git-ignored** (working notes). You don't write committed code — if a finding implies a
journey redesign, you hand it to `gok-bank-ux`; you never edit `e2e/` or product code.

## Finding schema (one block per finding)

```markdown
### PAY-U-02 · Paying a new payee takes 7 steps / 11 taps (benchmark: 4 / 6)
- **Severity:** S2 — friction on a P0 task
- **Type:** effort
- **Route:** /payments/transfer (new-payee path)
- **The job:** pay someone I've never paid before.
- **What the user experiences:** the send flow detours into a separate full-page payee-creation route,
  then a standalone speed screen, before review — the user scrolls and re-orients twice.
- **Cost:** 7 steps / 11 taps / 5 fields / 3 decisions / 2 scrolls. Intent (ux-flows §2) = 5 steps.
  Benchmark (Wise) ≈ 4 / 6.
- **Evidence:** screenshots/PAY-U-02-desktop.png, screenshots/PAY-U-02-mobile.png
- **Owner:** gok-bank-ux (redesign — inline new-payee) + gok-bank-product-owner (gate)
- **Status:** open
```

Required every time: ID, title, severity, type, route, the job, what-the-user-experiences, cost (with
numbers where it's an effort/reachability finding), evidence, owner, status.

## Severity (by experience impact)

See `heuristic-framework.md`. S1 = a real user would abandon/fail the core task; S2 = significant friction
or a scroll-hunted primary action on a P0/P1 task; S3 = noticeable friction on a secondary task or weak
scent; S4 = polish. When unsure on a P0 task, round up.

## Type field

`reachability` (primary action hidden/scroll-hunted/out of thumb zone) · `effort` (too many
steps/clicks/fields/decisions) · `friction` (wasted or missing friction vs trust) · `consistency` (user
must re-learn the pattern) · `information-scent` (can't tell where to go) · `reachability-a11y` (can't
reach/operate by keyboard, focus lost).

## ID convention

`<DOMAIN>-U-<n>` — `U` = usability/UX audit (QA uses `-Q-`). Domain prefixes:
`ACC` accounts · `PAY` payments · `CARD` cards · `LEND` lending · `INS` insurance · `INV` invest ·
`CRY` crypto · `MON` money (budgets/rewards) · `IDN` identity (onboarding/security/auth) ·
`SVC` servicing (documents/support) · `PLT` platform (home/nav/command palette).

## Routing map — who owns the fix

| Domain folder | Routes | Task-inherent friction owner | Journey-redesign owner |
|---------------|--------|------------------------------|------------------------|
| `accounts` | /accounts, /home, wallets, pots, statements | `gok-bank-accounts` | `gok-bank-ux` |
| `payments` | /payments/** | `gok-bank-payments` | `gok-bank-ux` |
| `cards` | /cards/** | `gok-bank-cards` | `gok-bank-ux` |
| `lending` | /lending/** | `gok-bank-lending` | `gok-bank-ux` |
| `insurance` | /insurance/** | `gok-bank-insurance` | `gok-bank-ux` |
| `invest` | /invest/** | `gok-bank-wealth` | `gok-bank-ux` |
| `crypto` | /crypto/** | `gok-bank-wealth` | `gok-bank-ux` |
| `money` | /budgets, /rewards | `gok-bank-money` | `gok-bank-ux` |
| `identity` | /onboarding, /login, /register, /security/**, /profile, /settings | `gok-bank-identity` | `gok-bank-ux` |
| `servicing` | /documents/**, /support/**, /activity | `gok-bank-servicing` | `gok-bank-ux` |
| `platform` | home shell, sidenav/navbar, command palette | `gok-bank-ux` | `gok-bank-ux` |

Routing rule: friction **inherent to the task** (regulation, required data) → the **domain expert** (is it
worth it?). Friction from a **design choice in the build** → **gok-bank-ux** (redesign the journey).
`gok-bank-product-owner` is on **every** finding as the value/ship gate. Anything *broken* (not just
painful) → hand to `gok-bank-qa`, don't log it here.

## Per-domain file header

```markdown
# Payments — usability findings (assessment v1)
Owner: gok-bank-ux / gok-bank-payments · Gate: gok-bank-product-owner · Auditor: gok-bank-ux-audit · Date: <YYYY-MM-DD>

| ID | Sev | Type | Title | Status |
|----|-----|------|-------|--------|
| PAY-U-01 | S2 | reachability | Send CTA below the fold on a 13" laptop | open |
| PAY-U-02 | S2 | effort | New-payee send is 7 steps (benchmark 4) | open |

## Tasks audited
Jobs walked: … · Viewports: desktop 1280×800 + mobile iPhone / Mobile Safari (WebKit) 390×844 · Not audited (and why): …

## Findings
<the blocks above>
```

The **Tasks audited** section is mandatory — name the jobs you walked and the ones you couldn't, so silence
never reads as "everything's fine."
