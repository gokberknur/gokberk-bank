# Playbook — collecting money & payees

The deep mechanics of the **inbound + directory** sub-area: getting money *in* and keeping the beneficiary
directory correct. Four specs — request money / link / QR (`P07`), split a bill (`P08`), top-up (`P09`), and
payee management + add-payee (`P10`). Read it when shaping, reviewing, or signing off any collect-money
surface or anything that touches the payee directory.

It applies `regulatory-and-trust.md` (confirmation of payee, IBAN/BIC correctness) to the directory and
ties the collecting flows to the money-spine rules — but goes deeper on the *math* and the *validation*.

## Contents

- [The inbound rule: no outflow → no danger dialog](#the-inbound-rule-no-outflow--no-danger-dialog)
- [Request money / link / QR (P07)](#request-money--link--qr-p07)
- [Split a bill (P08) — the money maths](#split-a-bill-p08--the-money-maths)
- [Top-up (P09) — instant card vs pending bank](#top-up-p09--instant-card-vs-pending-bank)
- [Payees & add-payee (P10) — the trust foundation](#payees--add-payee-p10--the-trust-foundation)
- [Edge cases across the sub-area](#edge-cases-across-the-sub-area)
- [Competitive patterns to match or beat](#competitive-patterns-to-match-or-beat)
- [Sub-area definition of done](#sub-area-definition-of-done)

## The inbound rule: no outflow → no danger dialog

`P07` and `P08` **don't move the user's money** — they ask others for it. So there is **no forced-decision
dialog**; the deliberate act is *sharing the link / sending the requests*, not committing a payment. `P09`
brings money *in* to the user's own account, so its confirm is a **plain** `gok-dialog` (not `tone="danger"`)
— inbound is low-stakes. The one destructive act in the whole sub-area is **deleting a saved payee** (`P10`),
which *does* earn the danger dialog because it removes trusted data every send flow depends on.

Don't reflexively stamp a danger confirm on these surfaces. Match friction to stakes: collecting and topping
up are not value-out events.

## Request money / link / QR (P07)

The inbound counterpart to send, and the engine `P08` reuses to mint per-share links.

- **Create** (`/payments/request/[step]`, a short 2-step `F05` wizard): amount (`F07`, default home EUR
  wallet, currency selectable) + optional note + destination wallet. Under "More options": optional **expiry**
  and a **"let payer choose the amount"** toggle (progressive disclosure; both are spec open questions).
- **Share**: a copyable readonly `gok-input` link + a **monochrome QR** (`QrCode.svelte`) rendered to that
  link. The QR uses `--gok-*` **ink/paper**, never hardcoded `#000`/`#fff`, no decorative/accent colour. A
  `gok-toast` confirms copy.
- **The QR is never the only way to pay** — the link is its **text alternative** (an a11y requirement). The
  QR encodes exactly the link.
- **Track** (`/payments/request`): a `gok-table` — note, amount, created, status `gok-badge` (Open / Paid /
  Expired / Cancelled), and a paid-fraction where partials apply. Row → a `gok-drawer` with the link/QR
  again, the payer if known, and **Cancel request** (a confirm dialog — it withdraws a *live* link).
- **Never imply money has arrived** before a (simulated) payment posts. Incoming payments are simulated
  deterministically (a seeded request reads Paid) — no real network.

## Split a bill (P08) — the money maths

Split a cost and collect each share as a `P07` request. The hard part is the **money maths**, and the
non-negotiable is that **shares always sum to the total** — visibly, with the rounding remainder owned, never
silently dropped.

- **Three methods** (`gok-segmented`): **Equal** / **By amount** / **By %**.
  - **Equal** divides evenly and **parks the rounding remainder on one clearly-marked row** (e.g. €10 / 3 →
    €3.34 / €3.33 / €3.33). The carry is honest and visible.
  - **By amount / By %** give each row its own money/percent input.
- **Live remainder** line that must reach zero. Over- or under-allocation **blocks Send reward-early** with a
  `gok-alert`; the remainder shows the gap ("€10 left to allocate"). Reserve the line to avoid layout shift.
- All split math is **integer minor units**; the equal split distributes the remainder **deterministically**
  (e.g. to the first row) so shares always sum exactly — **never float-divide and hope**.
- The user is **included as a payer by default** (their own share isn't requested). Non-payee people get a
  shareable link only.
- **Send** mints **one `P07` request per non-self person** (don't reinvent links) + a summary `gok-toast`. No
  outflow → **no forced dialog**.
- **Track** with a `gok-progress` settled fraction ("2 of 3 paid, €60 of €90"), reusing `P07` statuses; a
  reminder action re-shares an unpaid link.

## Top-up (P09) — instant card vs pending bank

The inbound "fund my account" act, and where the optimistic-vs-pending rule (`.planning/ux/patterns.md` §5)
is made visible for *incoming* money.

- **Flow**: amount + destination wallet (`F07`, min/max per method reward-early) → method → review → confirm
  → success. If the top-up currency differs from the source, disclose the **FX rate** (reuse `P04`).
- **Method** (`gok-segmented` / `gok-radio-group`): **Linked card** (instant) / **Bank transfer** (pending) /
  **Open banking** (pending). Each states its speed + any fee.
- **The honesty rule**: a **card** top-up is **optimistic** — balance up at once, `Settled` tag, rollback on
  failure. A **bank / open-banking** top-up is **pending** — an explicit `Processing` tag, the amount held
  **separate from settled balance**, with a `gok-alert` ("Processing — usually within an hour"). Never fake
  instant settlement for a bank transfer.
- **Confirm is a plain dialog**, not `tone="danger"` — money is coming *in*. Step-up (`F12`) only for an
  unusually large top-up or a newly-added source.

## Payees & add-payee (P10) — the trust foundation

The directory every send flow picks from. Getting a payee right is where IBAN/BIC correctness and the
name-match check live — this is the foundation the whole send sub-area stands on.

- **Manage** (`/payments/payees`): a `gok-table` — name (+ nickname), masked IBAN, type `gok-badge` (SEPA /
  SWIFT / gök / internal), last paid, verified status. An `F10` combobox filters by name/IBAN. Distinguish
  **zero-data empty** ("No payees yet") from **filtered-empty** ("No matches"). Row → a `gok-drawer` with
  Pay (→ `P02`/`P03`), Edit, and **Delete** (forced-decision `gok-dialog tone="danger" no-dismiss`).
- **Add payee** (`/payments/payees/new`, full `F05` wizard): **Type** (`gok-segmented`) drives which fields
  appear → **Details** → **Verify** → **Save**.
- **IBAN validation is mod-97, not regex-only.** A length/format check passes a transposed digit; the
  **mod-97 checksum** catches it. Run it **reward-early** on input; store the IBAN **normalised (no spaces)**,
  show it **masked** in mono/tabular figures. **BIC** is validated for the **8/11-char format**.
- **Duplicate detection** runs as the IBAN/handle resolves: a `gok-alert` ("You already have a payee with
  this IBAN") offers to **open the existing one** — never auto-merge, never silently skip.
- **Confirmation of payee** (the name-match sim): the bank returns the account holder's name. **Exact match**
  → success `gok-badge`. **Mismatch** → a `gok-alert` with the returned name and a **proceed-anyway forced
  acknowledgement** (`gok-checkbox` "I've checked this is correct") before save. Copy is plain and no-blame
  ("The name doesn't match. The account holder is shown as 'J. Smith'. Check before you continue."). This is
  the front line against **APP fraud** — friction here is protection, not annoyance.
- **Save**: optional nickname + an optional **Pay now** (`gok-switch` → hands to `P02`/`P03`).

## Edge cases across the sub-area

- **QR-only payment** → never; the link is always the text alternative.
- **Partial request payment** → show a `gok-progress` fraction; status stays Open until fully paid.
- **Cancel a live request** → confirm dialog (it withdraws something already shared).
- **Indivisible equal split** → remainder parked on one marked row, shares sum exactly.
- **Over/under-allocated split** → block Send reward-early with the live remainder.
- **Bank top-up** → pending, held off settled balance; **card top-up** → optimistic + rollback on failure.
- **Transposed-digit IBAN** → fails mod-97 reward-early; **bad BIC** → format error reward-early.
- **Duplicate IBAN** → open-existing offer, never a silent dupe.
- **Name mismatch** → cannot save without the explicit proceed-anyway acknowledgement.
- **Deleting a payee with history** → forced-decision dialog; it's trusted data every send depends on.

## Competitive patterns to match or beat

- **Revolut / Monzo** — request links, split bills with a live remainder, painless collection. Match the
  low-friction asking; keep the copy calm.
- **Monzo** — payee + reference clarity: last-used payees surfaced, references remembered.
- **UK banks** — confirmation of payee name-match before a first payment.
- The gök angle: the QR is monochrome ink-on-paper (no decorative colour), the split remainder is honest and
  visible, and the payee directory is verified, deduped, and masked — trust shown, not claimed.

## Sub-area definition of done

On top of the domain-wide `definition-of-done.md`, a collect/payee surface is done only when:

- [ ] Request creation and split are **dialog-free** (no outflow); top-up uses a **plain** (non-danger)
      confirm; payee **delete** uses the forced-decision dialog.
- [ ] A request yields a copyable link + a monochrome QR whose **text alternative is the link**; copy fires a
      toast; status by rule + icon + text; partials show a fraction.
- [ ] Split shares **sum exactly** to the total; an indivisible equal split parks the remainder on one marked
      row; over/under-allocation blocks Send reward-early; sending mints one `P07` request per non-self person.
- [ ] Card top-up is optimistic + rollback; bank/open-banking top-up shows `Processing` held off settled
      balance; FX disclosed for cross-currency; min/max reward-early.
- [ ] IBAN validated by **mod-97** (not just format) reward-early; BIC format checked; duplicate detection
      offers open-existing; a name **mismatch** requires the proceed-anyway acknowledgement before save.
- [ ] Empty + filtered-empty + loading states render; money is integer minor units; QR uses `--gok-*`
      ink/paper, never hardcoded hex.
- [ ] The gut check: is every payee the user can pick verified, deduped, and shown masked — and does every
      collect surface make clear that no money has left their account?
