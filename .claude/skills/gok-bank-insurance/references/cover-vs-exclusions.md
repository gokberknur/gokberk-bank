# Insurance — cover vs exclusions, at equal weight

The single most important discipline in this domain, and the brand's protection signature. Read it for **any**
quote (`N01`), policy cover summary (`N02`), or claim-against-cover surface (`N03`). When in doubt, this rule
wins.

## The rule

**"What's covered" and "What's not covered" render at equal visual weight.** Same heading level, same type
scale, same colour role, same prominence, same default open/closed state. Exclusions are *never* smaller,
greyer, lower-contrast, collapsed-only, below the fold, or behind a "see more". A user must be able to learn
what they **don't** get as easily — and as early — as what they do.

## Why this exists (the why a junior must understand)

- **It's where trust is won or lost.** The moment a customer discovers an exclusion is at claim time — exactly
  when they're most vulnerable and least forgiving. Every buried exclusion is a future betrayed customer and a
  declined claim that feels like a con. Surfacing it at purchase is the honest, premium move.
- **It's the IPID principle, made interactive.** The EU's Insurance Product Information Document exists *because*
  insurers historically hid limits in the small print. The IPID forces "what is insured" and "what is not
  insured" onto the same standardised two-page sheet. Our equal-weight ledger is that document, alive in the UI.
- **It's brand-congruent.** gökberk's voice is honest, editorial, restraint over noise. Loud cover + whispered
  exclusions is a dark pattern; the brand doesn't do dark patterns. Equal weight *is* the brand here.

## What "equal weight" means concretely

- **One component, two panels.** Derive covered and excluded from the *same* component (the `CoverLedger`
  shared across `N01`/`N02`) so neither can drift. If they're built separately, one will eventually get a
  quieter treatment by accident — don't allow the possibility.
- **Identical heading level.** If "What's covered" is an `<h3>` accordion header, so is "What's not covered".
  Equal `aria-expanded` semantics; if one defaults open, both do.
- **Identical type + colour roles.** Same `--gok-*` text role, same size, same weight. Exclusions are **not**
  rendered in a muted/secondary text token. No red-danger styling either — an exclusion is a neutral fact, not
  an error or a warning.
- **Stated as plain fact.** "Not covered: flood damage." Not "Unfortunately, certain perils may be subject to
  limitations." Plain, specific, scannable — the same register as the covered list.
- **Order doesn't smuggle hierarchy.** Covered-then-excluded is fine, but don't let "first = more important"
  become "second = ignorable." Equal containers, equal air.

## How to verify it (and how the test enforces it)

The `N01`/`N02` tests assert covered and excluded lists render at **identical heading level and type size**.
That's the machine check. Your human check:

- Squint at the quote screen. If your eye lands only on the covered list, it fails.
- Read it as a customer who's about to claim for the *excluded* thing. Would they say "nobody told me"? If yes,
  it fails.
- Check both themes (light/dark) and reduced-motion. The contrast and prominence must hold in all.

## Anti-patterns — reject on sight

- Exclusions in smaller, lighter, or secondary-token type. ❌
- "What's covered" expanded by default, "What's not covered" collapsed by default. ❌
- Exclusions only inside a downloadable PDF / linked IPID, not on-screen. ❌ (Link the IPID *and* show them.)
- Exclusions under a "Show details" / "Read more" the covered list doesn't need. ❌
- Marketing the cover loudly ("Fully protected!") while the exclusions sit in a footnote. ❌
- Styling exclusions as `tone="danger"` red — it frames them as scary rather than as honest facts. ❌

## The line you hold

Any time someone proposes making exclusions "less prominent so we don't scare people off," that's the wrong
instinct and you say so: a customer scared off by an honest exclusion was going to be a furious customer at
claim time. We'd rather they understand and buy with confidence — or walk away informed. **Equal weight is not
negotiable.** It is the one thing this domain will not trade for conversion.
