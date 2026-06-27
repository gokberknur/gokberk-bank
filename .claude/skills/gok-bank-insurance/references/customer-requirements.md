# Insurance — customer requirements

What protection customers actually need, framed as jobs-to-be-done. Use this to scope features and judge
priority — a protection surface earns its place by serving one of these jobs honestly, not by adding cover
lines or upsells.

## Core jobs-to-be-done

- **"Protect the thing I just got / the trip I just booked — at the point of need."** The embedded/affinity
  job. Gadget cover when you buy a phone, travel cover when you book, purchase protection on a big spend. The
  job is *relevant cover, offered in context, bought in seconds* — not a separate insurance shopping trip.
- **"Cover the big risks I can't self-insure."** Home/contents, life. The job is *peace of mind* — and here
  the customer reads the exclusions hardest, because the stakes are high. Honesty about what's *not* covered is
  the whole product.
- **"Understand exactly what I'm buying before I buy it."** The cross-cutting job under every other one. Premium
  (monthly + annual), excess, limits, and — equally — exclusions and the cooling-off window. This is the job
  the brand wins on: IPID-grade clarity, not a wall of terms.
- **"Manage what I already have without friction."** See my cover, open my documents, renew, change cover, or
  cancel — cleanly, no guilt-trip. The job is *control and reassurance* between buying and claiming.
- **"Get help when something's gone wrong — without being treated like a fraud."** File and track a claim. The
  job is *a calm, fair, visible process* and an honest decision. See `references/claims-doctrine.md`.

## Product lines and what each customer weighs

- **Gadget / device** — fast, low-friction, bought at point of sale; cares about *what counts as accidental
  damage* and the excess. Exclusions (wear-and-tear, loss vs theft) are the make-or-break detail.
- **Travel** — bought per-trip or annual; cares about cancellation cover, medical, and the *exclusions*
  (pre-existing conditions, extreme sports, undeclared destinations). Cover dates (date-range) matter.
- **Purchase protection** — embedded on a big card spend; cares about the claim window and proof-of-purchase.
- **Home / contents** — higher stakes; reads sums insured, single-item limits, and exclusions (flood, accidental
  vs named perils) closely. The equal-weight ledger earns its keep here.
- **Life** — the most consequential; longer cooling-off (often 30 days), beneficiary clarity, exclusions
  (e.g. non-disclosure) stated plainly. Calm, serious tone.
- **Pet, motor** — line-up candidates; may need extra detail steps (vehicle reg, property survey) — scope per
  product, don't assume.

## Must-haves (table stakes — a credible protection product has all of these)

- A transparent quote: cover level, add-ons (each with a price delta), excess, **monthly and annual** premium.
- Cover **and** exclusions shown at equal weight, before purchase.
- The cooling-off / withdrawal window stated on the quote and again on success.
- Cover dates via the date-range picker, validated within product limits.
- Policy management: cover summary, documents, renewal date + premium delta, a clean no-blame cancel.
- File & track a claim with an honest status (Submitted → In review → Decision) and a reference.
- Reward-early validation (eligibility, sums insured) and no-blame errors and declines.

## Nice-to-haves (differentiators — earn trust, never at the cost of clarity)

- Point-of-need embedded offers (cover the phone you just bought) — relevant, never nagging.
- Mid-term cover adjustment without re-running the whole wizard.
- A clear renewal preview ("Renews in 12 days, premium +€1.20/mo") well before the charge.
- Evidence reuse and draft-resume on claims.

## What customers fear (design against these)

- **A hidden exclusion that surfaces at claim time.** → equal-weight cover/exclusions at purchase; the single
  biggest trust lever. See `references/cover-vs-exclusions.md`.
- **Being locked in / a hard-sell cancel path.** → cooling-off honoured, cancel is clean and no-blame, no
  retention dark patterns.
- **Being treated as a fraud when they claim.** → calm, no-blame claims; honest gating, not accusation.
- **A premium that creeps or surprises.** → monthly + annual disclosed up front; renewal delta shown early.
