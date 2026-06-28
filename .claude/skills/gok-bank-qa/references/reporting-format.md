# Reporting format — the findings schema and the routing map

Every QA finding is filed into `assessmentv1/<domain>/qa-findings.md` using the schema below, so the
owning team and the CPO can act without chasing you. Screenshots go in `assessmentv1/<domain>/
screenshots/`. The `assessmentv1/index.md` rollup aggregates counts across all domains — keep your
per-domain file accurate and the rollup reconciles.

## Where findings live

```
assessmentv1/
  index.md                 # CPO rollup — counts per domain × severity, top blockers
  <domain>/
    qa-findings.md         # yours
    ux-findings.md         # gok-bank-ux-audit's
    screenshots/<ID>.png   # your evidence
```

`assessmentv1/` is **git-ignored** (working notes). The E2E specs you write are **committed** under
`e2e/<domain>/` (durable regression net). Don't put findings in `e2e/` or specs in `assessmentv1/`.

## Finding schema (one block per finding)

```markdown
### PAY-Q-03 · Disclosed FX rate doesn't match committed amount
- **Severity:** S1 — blocker
- **Type:** data-integrity
- **Route:** /payments/exchange  (review → confirm step)
- **Steps to reproduce:**
  1. Home → Exchange. 2. From EUR 100.00 to USD. 3. Review shows rate 1.08 → $108.00.
  4. Confirm. 5. Activity shows -€100.00 / +$106.50.
- **Expected:** committed USD equals the disclosed amount to the cent ($108.00). Spec: payments/P04.
- **Actual:** committed $106.50 — a hidden spread not disclosed on review.
- **Evidence:** screenshots/PAY-Q-03-review.png, screenshots/PAY-Q-03-receipt.png
- **Owner:** gok-bank-payments + gok-bank-product-owner (ship gate)
- **Suggested fix area:** FX quote→commit reconciliation in the exchange store; disclose spread on review.
- **Linked E2E:** e2e/payments/exchange.fee-matches-commit.spec.ts
- **Status:** open
```

Required every time: ID, title, severity, type, route, steps, expected, actual, owner, status. Evidence is
required for any verified finding (no screenshot/snapshot → mark it `unverified` in status and say why).
Linked E2E is required for S1/S2.

## ID convention

`<DOMAIN>-Q-<n>` — `Q` = QA. The UX auditor uses `-U-`. Domain prefixes:
`ACC` accounts · `PAY` payments · `CARD` cards · `LEND` lending · `INS` insurance · `INV` invest ·
`CRY` crypto · `MON` money (budgets/rewards) · `IDN` identity (onboarding/security/auth) ·
`SVC` servicing (documents/support) · `PLT` platform (home/nav/command palette).

## Routing map — who owns the fix (reused from expert-reminder.sh)

| Domain folder | Routes | Owner skill |
|---------------|--------|-------------|
| `accounts` | /accounts, /home, wallets, pots, statements, transactions | `gok-bank-accounts` |
| `payments` | /payments/** (send, exchange, split, request, payees, scheduled, direct-debits) | `gok-bank-payments` |
| `cards` | /cards/** | `gok-bank-cards` |
| `lending` | /lending/** (loans, mortgages, credit-line) | `gok-bank-lending` |
| `insurance` | /insurance/** | `gok-bank-insurance` |
| `invest` | /invest/** | `gok-bank-wealth` |
| `crypto` | /crypto/** | `gok-bank-wealth` |
| `money` | /budgets, /rewards | `gok-bank-money` |
| `identity` | /onboarding, /login, /register, /forgot-password, /lock, /security/**, /profile, /settings | `gok-bank-identity` |
| `servicing` | /documents/**, /support/**, /activity | `gok-bank-servicing` |
| `platform` | home shell, sidenav/navbar, command palette, cross-cutting | `gok-bank-ux` + `gok-bank-product-owner` |

`gok-bank-product-owner` is on **every** finding as the ship gate, in addition to the domain owner.

## Per-domain file header

Start each `qa-findings.md` with a small table of contents so the owner can triage at a glance:

```markdown
# Payments — QA findings (assessment v1)
Owner: gok-bank-payments · Gate: gok-bank-product-owner · Tester: gok-bank-qa · Date: <YYYY-MM-DD>

| ID | Sev | Type | Title | Status |
|----|-----|------|-------|--------|
| PAY-Q-01 | S2 | state-coverage | No pending state on SEPA send | open |
| PAY-Q-03 | S1 | data-integrity | Disclosed FX rate ≠ committed amount | open |

## Coverage
Routes tested: … · States opened: … · Not tested (and why): …

## Findings
<the blocks above>
```

The **Coverage** section is mandatory — silence must never read as a pass. List what you could not reach
and why (blocked fixture, 404 route, unreachable state).
