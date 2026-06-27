# Payments — competitive benchmarks

How the best move money, so gökberk bank can match or beat them. Use this to calibrate "how good does this
have to be?" — the answer is usually "better than the incumbent, as good as the best neobank."

## The bar-setters

- **Wise (TransferWise)** — the gold standard for **cross-border transparency**. Mid-market rate shown openly,
  fee broken out, recipient-gets amount up front, believable delivery ETA, live tracking. If our SWIFT/FX
  flow is less transparent than Wise, it's wrong.
- **Revolut** — speed + breadth: instant internal, multi-currency, FX with a clear rate, split bills, request
  links, scheduled. Fast, dense, slightly busy. Match the speed and clarity; stay calmer.
- **N26** — clean, restrained payments UX; Spaces (pots) for organising; MoneyBeam-style instant sends.
  Closest in spirit to gökberk's editorial calm.
- **Monzo** — best-in-class **everyday clarity**: instant notifications, payee management, scheduled
  payments, bill splitting, "Pots". Microcopy is warm and human without being cute.
- **Traditional banks (incumbents)** — the contrast: clunky multi-step transfers, hidden FX margins,
  confusing standing-order vs direct-debit, poor pending visibility. We win by being clearer and faster.

## Patterns worth stealing

- **Wise's "you send / they get" panel** with the rate, fee, and ETA all visible before confirm.
- **Revolut/Monzo instant-send feel** — the confirm-to-done latency is near-zero for internal/instant rails;
  the success screen is immediate and unambiguous.
- **Monzo's payee + reference clarity** — last-used payees surfaced, references remembered, recurring made
  obvious.
- **Rate-lock countdown** (Revolut/Wise) on FX so the user knows the quote is live and will refresh.
- **Confirmation of payee** (UK banks) name-match warning before a first payment.

## Anti-patterns to avoid (where incumbents and even neobanks fail)

- Burying the FX margin or showing only the marked-up rate.
- Faking instant completion on a rail that's actually pending (erodes trust on the first failure).
- Standing-order / direct-debit confusion presented to the user as one undifferentiated "recurring".
- Over-cluttered payment hubs with 12 entry points and no hierarchy.
- Dead-end limit errors ("transaction declined") with no reason and no path forward.

## The gökberk angle

Match the neobanks on speed and transparency; **beat** them on calm and clarity. Where Revolut shows ten
options, we show the right one and tuck the rest under "More options". Transparency is our trust signal:
disclose the rate, the margin, the fee, the ETA — plainly, in numerals, with one earned accent on the
primary action. The differentiator isn't a new rail; it's a payment you understand completely before you
send it.
