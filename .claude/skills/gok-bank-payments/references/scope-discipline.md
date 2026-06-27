# Payments — scope discipline

Your mandate to **control what gets built**. A domain expert's value is as much in what they refuse as what
they ship. Use this at every scope decision; when something feels like creep, say so and point here.

## What gökberk bank delivers (in scope)

- Send: internal (instant), SEPA + SEPA Instant, SWIFT/international with FX.
- FX exchange between own wallets.
- Recurring: scheduled payments, standing orders, SEPA Direct Debit mandate visibility + control.
- Collect: request money, payment links, QR, split a bill.
- Top-up a wallet.
- Payee/beneficiary management with confirmation-of-payee safety.

This set fully exercises the money spine, multi-currency, and pending/settled truth. It's a complete,
credible payments product for a pan-European neobank demo.

## What we do NOT build (and why)

- **Real payment processing / banking-as-a-service integration.** It's a mock demo — all rails are
  simulated, deterministically. Never wire a real PSP.
- **Crypto sends from the payments hub.** Crypto lives in `gok-bank-wealth` (network/address/QR concerns are
  different). Don't blur the two.
- **Bill-pay biller directories / e-invoicing networks.** High effort, low demo value; a standing order or
  direct debit covers the "pay a bill" job.
- **Cardless ATM / cash withdrawal codes, cheque imaging, wire-via-branch.** Out of a neobank's spirit and
  the demo's scope.
- **Every conceivable rail (Faster Payments, ACH, Bacs, Swish, Pix…).** We're pan-European: SEPA + SWIFT is
  the model. Don't sprawl into other geographies' rails.
- **A second confirm dialog on low-stakes reversible actions.** Internal sends and own-wallet moves are
  optimistic + undo, not forced-decision. Friction must match stakes.

## Creep signals — push back when you see these

- "Let's also support [other country's rail]" → no; pan-European model is SEPA + SWIFT.
- "Add a dropdown for [obscure SWIFT field]" → only if it changes the money or the ETA; otherwise tuck or cut.
- "Make every payment require 2FA" → no; SCA exemptions exist for a reason — don't nag on trusted/small.
- "Build a payments dashboard with 12 widgets" → the hub shows the right next actions, not everything.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not building a biller directory — it's high
effort for little demo value. The 'pay a bill' job is already served by standing orders and direct-debit
mandates, which are in scope and more on-brand for a neobank." A good no protects the product and teaches the
team the domain.
