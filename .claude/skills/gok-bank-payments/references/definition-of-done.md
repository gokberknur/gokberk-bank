# Payments — definition of done

The quality bar a payment surface must clear before you'll sign it off. This is the domain lens, on top of
the feature spec's own Success Criteria, the `gokberk-design` visual gate, and `gok-bank-ux`'s flow review.
If a payment surface fails any of these, it's not done.

## Correctness & rail truth

- [ ] The rail's promise is honest: instant rails show immediate settlement; SEPA standard / SWIFT show a
      real **pending** state separate from settled balance — no faked completion.
- [ ] Cross-currency shows mid-rate, margin, your-rate, fee, and **they-receive**, all before confirm.
- [ ] SWIFT charge option (OUR/SHA/BEN) changes the fee/they-receive correctly and is disclosed.
- [ ] Money is integer **minor units**; FX uses scaled-integer rates (never float-multiply).

## Safety & trust

- [ ] Every cost (fee, rate, margin, ETA) is disclosed on **review**, before the forced-decision confirm.
- [ ] New-payee / large-amount / unusual payments get extra friction (CoP name-match warning, step-up).
- [ ] Irreversible payments use a forced-decision `gok-dialog tone="danger" no-dismiss`; reversible ones use
      optimistic + undo. Friction matches stakes.
- [ ] Limits and SCA are explained, never dead-ends — there's always a next step.

## Validation & error handling

- [ ] Insufficient funds, over-limit, invalid IBAN (mod-97), bad BIC surface **reward-early** (as typed),
      cleared live on fix.
- [ ] Errors say what happened and what to do; they never blame the user.
- [ ] Quote expiry (FX) forces a re-quote before confirm.

## States & feedback

- [ ] Loading, empty, error, and pending states are all present and correct per `.planning/ux/patterns.md`.
- [ ] Every completed payment yields a receipt/reference and a clear status; pending shows a cancel-until-
      cut-off affordance where the rail allows.

## Consistency

- [ ] Reuses the shared transfer wizard/draft and the money/FX engines (don't fork per-rail logic).
- [ ] Pending vs. settled, available vs. current balance are consistent with `gok-bank-accounts`.
- [ ] The journey matches the patterns `gok-bank-ux` enforces; scope matches what you declared in.

## The gut check

Would a real payments customer trust this with €1,200 to a new payee abroad? If any part would make them
hesitate about cost, destination, timing, or reversibility — it's not done.
