# Sub-area playbook — Revolving credit line / credit card (L05)

The deep, narrow playbook for the **revolving credit facility** — a credit card or a flexible credit
line — spec `.planning/features/lending/L05-credit-card-line.md`. This narrows the cross-cutting refs to
*revolving* credit, which behaves unlike a fixed loan: there's no fixed term and no single amortization,
so the disclosure centre shifts to **representative APR + a worked example**, and the servicing rhythm is
**statement → minimum payment → due date → utilisation**.

Revolving credit is **CCD** (like personal loans) — so the figure is **APR** (not APRC) and the example
is the **representative example**. But the *shape* differs from a personal loan: an open-ended limit, a
recurring statement cycle, and a minimum-payment cost warning that has no analogue in a fixed loan.

## 1. Apply — eligibility → limit offer → e-sign

Full-page `F05` wizard (`/lending/credit-card/apply/[step]` and `/lending/credit-line/apply/[step]` —
shared composites, two variants):

1. **Amount / eligibility** — requested limit (money input `F07`) + brief finances; the soft-search
   consent line in the verbatim phrasing **"Soft search — won't affect your score"**; an honest
   **pending** ("Checking…") → eligible / referred / declined.
2. **Limit offer** (the disclosure centre) — a `gok-card` ledger (§2).
3. **E-sign** — forced decision via `D02` + step-up (`F12`); facility opens only after signing.
4. **Done** — available credit ready, agreement in the vault, the **14-day withdrawal right** stated,
   and (card variant) the virtual card issued / physical card ETA.

## 2. The limit offer ledger — representative APR is the centre

A revolving offer has no term and no amortization, so the **representative APR + worked example** does
the disclosure work a personal-loan total-repayable would. Mandatory lines before "Continue to sign":

| Line | Note |
|---|---|
| **Approved credit limit** | may be **lower than requested** — stated plainly, with a reason, no blame |
| **Representative APR** | the headline cost figure, carrying "representative" |
| **Representative example** | a worked block of equal weight, e.g. "Assumed limit €1,200 at 24.9% APR variable → representative 24.9% APR" |
| **Purchase rate / cash-advance rate** | each stated — cash advances usually cost more; don't hide it |
| **Annual fee** | itemised, or "No annual fee" if none |

The representative example is **mandatory and not cuttable** (`scope-discipline.md`). A
lower-than-requested limit is the revolving analogue of a partial decline — handle it with the same
no-blame posture: the offered limit, a plain reason, and "accept the offered limit **or** decline."

## 3. Manage — the statement rhythm

Route `/lending/credit-card/[id]` · `/lending/credit-line/[id]`. The summary ledger is the heart:

- **Current balance**, **available credit**, **credit limit**, and a `gok-progress` of **utilisation**
  with a **text read-out** (not colour alone).
- **Statement balance**, **minimum payment**, **payment due date** — with a `gok-tag` if **due soon /
  overdue** (status by rule+icon+text, never colour alone).
- The honest guidance line: **"Pay your statement balance to avoid interest."** This is the on-brand
  counter to the BNPL/incumbent habit of nudging toward the minimum.
- **Statement** — a `gok-table` of the latest cycle's transactions (date, merchant, amount; numeric
  columns tabular), linking to past statements in the vault (`D01`). Set `columns`/`rows` via `setProps`;
  events via `on`; **no `bind:`**; never restyle the table.

## 4. Repay — minimum / statement / custom, with the cost shown

The repay drawer/dialog rides the money spine, and its defining honesty is the **interest-impact note**:

- Three choices via `gok-segmented`: **minimum** / **statement balance** / **custom amount** (money
  input), funded from a wallet.
- The **minimum-payment cost warning**, stated as fact: "Paying the minimum, €X interest will be charged
  next cycle." This is the single most important honesty signal of the surface — paying only the minimum
  is where revolving credit quietly costs the most. State it; never bury or soften it.
- The **minimum payment rule** is typically *the greater of a fixed € or a % of balance* — confirm the
  exact rule with the mock-data owner; compute on **integer-scaled rates** (never float-multiply).
- Flow: choose → review ledger → **forced-decision confirm** ("Pay €X") → success (`gok-tag`, updated
  **available credit**, cancel-window per policy). A pending repayment is held **separate** from
  available credit (`gok-tag` Processing) until it clears — never inflate available credit early.

## 5. Edge cases this surface must handle

- **Lower-than-requested limit** — accept-or-decline, plain reason, no blame (the partial-decline path).
- **Over-limit / past-due** — surfaced by rule+icon+text, no blame copy; not hidden behind colour.
- **Insufficient funding wallet** on repay — reward-early block, no-blame.
- **Pending repayment** — available credit updates only on clear, not on submit.
- **Card vs line split** — the card variant adds issuance / PAN (possibly reusing `C02`); the line is
  draw/repay. Confirm what's genuinely shared vs variant-specific with the spec — don't duplicate the
  whole flow per variant.
- **Promo rate** — only if the spec models one, and only stated **plainly with its end date and go-to
  rate**. "0% for 12 months!!" is forbidden (`regulatory-and-trust.md` no-hype rules).
- **Draft resume** — abandon mid-apply → resume at the right step with data intact.

## 6. Competitive angle (narrowed)

Borrow **Klarna's** point-of-decision legibility (the exact cost, in plain figures) — but show the
**representative APR + example** where Klarna shows only the instalment, and **never nudge toward the
minimum**. Beat the incumbent card's failures: an APR with no representative example, a minimum-payment
default presented as the friendly option, a statement that hides the cost of carrying a balance. (Full
benchmarks: `competitive-benchmarks.md`.)

## 7. Sub-area definition of done (on top of `definition-of-done.md`)

- [ ] Apply runs eligibility → limit offer → e-sign → done for **both** the card and line variants.
- [ ] The offer shows the **approved limit** (even when lower than requested, with a plain reason),
      **representative APR**, a **worked representative example**, all rates (purchase + cash advance),
      and any **annual fee**.
- [ ] The soft-search consent line uses the "won't affect your score" phrasing; the check resolves
      eligible / referred / declined deterministically.
- [ ] Manage shows balance, **available credit**, limit + **utilisation** (with a text read-out),
      statement balance, **minimum payment**, and **due date**; due-soon / overdue / paid by
      rule+icon+text.
- [ ] Repay supports minimum / statement / custom with the **interest-impact note** and a
      forced-decision confirm; a pending repayment is held separate from available credit until it clears.
- [ ] E-sign requires step-up; declining returns with no side effect; success states the **14-day
      withdrawal right**.
- [ ] No teaser hype; any promo rate states its end date + go-to rate; min-payment math on integer-scaled
      rates; money in integer minor units.
