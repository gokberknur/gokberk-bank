# Cards — customer requirements

What card customers actually need, framed as jobs-to-be-done. Use this to scope features and judge priority —
a card surface earns its place by serving one of these jobs well, not by piling on toggles.

## Core jobs-to-be-done

- **"Let me use my card, but on my terms."** The dominant job. A card customer wants to spend frictionlessly
  *and* feel in command of where, how, and how much. Controls (freeze, channels, limits, regions) are the job
  — not a settings afterthought.
- **"Stop it now — I'll figure out the rest later."** When a card is mislaid, the instinct is to kill it in
  one tap and reverse later if it turns up in a coat pocket. Freeze must be instant, prominent, and
  reversible; a permanent cancel (lost/stolen → replace) is a deliberate, separate, heavier act.
- **"Give me a card I can throw away."** Privacy-minded and online-shopping customers want a virtual or
  **disposable** card to hand to a merchant they don't fully trust — so a breach or an over-charge can't reach
  the real account. The job is *containment*: a number with a blast radius.
- **"Show me my number safely."** Customers need the PAN/CVV to type into a checkout, or the PIN at an ATM —
  but only them, only now, and not left lingering on a screen someone could photograph.
- **"Tell me who's charging me, and let me say no."** A 3-D Secure prompt is the customer's moment of control
  over an online charge: who, how much, when — approve or decline, and a clear path if they don't recognise
  it.
- **"Put it on my phone."** Adding the card to Apple Pay / Google Pay is now table-stakes; the job is a short,
  reassuring provisioning flow that explains what a wallet token is.

## Segments and what they weigh

- **The everyday spender** — wants a card that just works, instant freeze for peace of mind, and a clear view
  of what the card spent this month.
- **The privacy-conscious online shopper** — lives on virtual + disposable cards, merchant-scoped, with tight
  per-card limits; hates handing a real number to a website.
- **The security-anxious** — values channel toggles (turn off online/ATM when not needed), region locking for
  travel, and the 3-DS prompt as reassurance, not friction.
- **The traveller** — region allow-list, contactless/ATM control abroad, and a fast freeze if a card goes
  missing in a foreign city.

## Must-haves (table stakes — a serious card programme has all of these)

- A wallet of cards (physical · virtual · disposable) with at-a-glance status, and a detail per card.
- Reveal the full card number / CVV behind a re-auth, auto-hiding so it never lingers.
- Instant freeze / unfreeze, reversible, with clear feedback.
- Order a virtual card instantly; order a physical card with a delivery ETA; report lost/stolen → replace.
- Per-channel control (online · contactless · ATM), a daily spend limit, and a region restriction.
- View / change the PIN, gated and verified.
- A 3-D Secure approval that names the merchant + amount and forces a decision.
- Add to Apple Pay / Google Pay.
- Per-card spend this month (by category) and recent transactions on the card.

## Nice-to-haves (differentiators — earn delight, but not at the cost of clarity)

- Single-use disposable cards that regenerate after each purchase.
- Per-card / per-merchant spend caps and subscription-style monthly limits.
- "Didn't recognise this?" straight from the 3-DS prompt into a dispute.
- Wallet-status reflected on the card detail (already in Apple Pay / not yet).

## What customers fear (design against these)

- **My number leaks.** → mask by default; reveal only behind a step-up; auto-hide; virtual/disposable for
  containment.
- **A charge I didn't make.** → freeze in one tap; 3-DS naming the merchant + amount; a dispute escape hatch.
- **I froze it and it didn't actually freeze.** → optimistic update *with* honest rollback on failure, never a
  faked freeze.
- **The number stayed on screen.** → WCAG-safe auto-hide countdown that re-masks; never persist a revealed
  PAN/PIN.
