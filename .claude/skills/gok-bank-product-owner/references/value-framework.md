# Value framework — does this feature earn its place?

How you judge whether a thing is worth building and at what priority. The default answer to "should we add
this?" is **no, unless it earns the yes** — because every feature has a cost in focus, surface area, and the
calm the brand promises, and that cost is paid forever while the value is often hypothetical. This is the
discipline that keeps gökberk a sharp, premium bank instead of a junk drawer of half-built ideas.

## Start with the job, not the feature

A feature is a *solution*; the thing that earns its place is the **job-to-be-done** underneath it. Before you
score anything, force the question into JTBD shape:

> "When [situation], a customer wants to [motivation], so they can [outcome]."

- "Add a social feed" → what job? "When I split a bill, I want to settle up without nagging" — the job is
  *settling shared money*, which `gok-bank-payments` split-bill (P08) already serves. A feed is a solution
  looking for a job.
- "Add round-ups" → "When I spend, I want to save without thinking about it" — a real job, served simply.

If you can't name the job, the situation, and who has it, that's your first signal to **Cut**. If you can,
ask whether an *existing* surface already serves it better — most "new feature" requests are a worse second
solution to a job that's already covered.

## The Kano lens — know which bucket you're in

The single most useful sort. Mislabel the bucket and you misallocate effort.

- **Basic / table-stakes** — expected; their *absence* enrages, their presence earns nothing. (Accurate
  balances, working transfers, login that holds, statements, card freeze, fee/rate disclosed before commit.)
  Rule: these must be **flawless**, never "delightful." You don't innovate on a table-stake; you make it
  invisible and correct. Under-build one and you're not a bank.
- **Performance** — more is linearly better, and competitors are graded on it. (FX transparency, transfer
  speed, breadth of payees/rails, investing depth, search quality.) Rule: be **at or above** the bar set by
  the relevant competitor in `references/fintech-landscape.md`. This is where "competitive" is decided.
- **Delight** — unexpected, creates love, but only *after* basics and performance are solid. (The
  instant-spend fingerprint, a genuinely calm review screen, a thoughtful empty state.) Rule: earn delight,
  don't lead with it. A delight feature built while a table-stake wobbles is a misallocation, and you say so.

The trap to veto: **delight built on a cracked foundation.** A crypto staking widget or a social feed is
delight-or-novelty; if the dashboard, transfers, or disclosures aren't world-class yet, the answer is "fix
the foundation first."

## The value vs. cost call

Weigh both sides honestly. Enthusiasm is not evidence.

**Value** — does it:
- Serve a real, named job for a real segment (not a hypothetical "some users might")?
- Deepen the **primary relationship** (trust, daily habit, the next product) or just add a lonely island?
- Move a metric that matters (see north-star, below) — or is it activity for activity's sake?
- Differentiate on an axis gökberk chose to win (clarity, trust, calm, transparency, depth)?

**Cost** — does it:
- Add surface area, settings, edge cases, and support burden — *forever*?
- Compete with the calm? More entry points, more cognitive load, more "what is this for?"
- Pull effort from a table-stake or performance gap that matters more right now?
- Carry regulatory, trust, or brand risk (BNPL-style impulse monetization, crypto volatility surfacing)?

A feature earns its place when value clearly beats cost **and** it fits what gökberk is trying to be. "Cool"
and "competitors have it" are not by themselves a yes — competitors also have bloat.

## Prioritization — when it's "which, not whether"

When the question is sequencing, use the lightest tool that decides it:

- **Value vs. effort (2×2)** — the default. High-value/low-effort first; high-value/high-effort is the real
  roadmap; low-value/anything is a Cut or a "later." Fast and usually enough.
- **RICE** — when stakeholders disagree on priority. `(Reach × Impact × Confidence) ÷ Effort`. Its real job
  is to expose soft assumptions: a feature people *feel* strongly about often has low Reach or low Confidence
  once you write the numbers down. Use it to puncture hype, not to manufacture false precision.
- **The opportunity-cost question** — the one you always ask: "what doesn't get built if we build this?"
  Saying yes to X is saying no to whatever the same effort could have done. Make that trade explicit.

For gökberk specifically: **table-stakes and trust-builders outrank novelty**, and **depth-building features
that earn the primary relationship outrank breadth that adds islands** — because depth is where lifetime
value and the business actually live (see the landscape reference).

## North-star alignment

A feature should plausibly move the north star or a clearly-linked input, or it's activity, not progress.
gökberk's north star is the **primary-relationship**: *the account people trust enough to run their life
from.* Healthy input metrics: deposit/salary inflow, weekly active use of core money surfaces, products held
per customer (depth), trust signals (low surprise/complaint, completed sensitive flows). Anti-metrics to
distrust: raw feature count, screens shipped, vanity engagement on islands nobody returns to.

## The VETO criteria — when you kill or send it back

Exercise the veto — **Cut** outright — when any of these is true:

1. **No nameable job.** You can't state the situation, motivation, and who has it. It's a solution in search
   of a problem.
2. **Already served better elsewhere.** An existing surface (or a domain expert's planned scope) covers the
   job; this is a worse, redundant second door.
3. **Off-brand or off-strategy.** It fights the calm, premium, trustworthy posture — social feeds, gamified
   noise, impulse/BNPL-style monetization, confetti, dark patterns, attention-farming. gökberk doesn't
   monetize against its own customer's interest.
4. **Foundation isn't ready.** It's delight/novelty while a table-stake or a known performance gap is still
   weak. The honest verdict is "not now — fix the foundation."
5. **Cost dwarfs value.** Permanent surface area, settings, edge cases, support, and regulatory load for a
   thin or hypothetical upside.
6. **Scope creep.** It's a "while we're in here…" that grows a spec past what it set out to do; send it back
   to a proper decision instead of letting it ride along.

When you veto, never just say no — **Cut** with a reason and a better path, or **Reshape** into the smaller
thing that *does* earn its place (often: the same job, served by an existing surface, or a 20%-effort version
that captures 80% of the value). Killing the wrong feature protects the right ones — that's the job.

## Guard against feature bloat

The cumulative failure mode is death by a thousand reasonable yeses — each feature defensible alone, the
whole an incoherent pile. Defenses you apply at every gate:

- **One in, ask what comes out.** Adding a surface is a budget; spend it deliberately.
- **Hold the line on entry points.** Every new tab, card, or quick-action competes for the user's calm.
- **Prefer deepening over widening.** Make an existing surface excellent before adding a new one.
- **"No" is a complete product decision.** Protecting focus *is* shipping value. The best PMs are remembered
  for what they refused.
