# Task-completion audit — turning "how hard is this?" into a number

"Feels hard" is not a finding. "Paying a new payee is 7 steps and 11 taps; Wise does it in 4 and 6" is.
This is the method for putting a number on effort so the owner can act and the CPO can weigh it.

## 1. Define the job

For the domain/screen, write the **core job** as a user goal, not a feature: "send €50 to a friend who's
already a payee", "pay someone I've never paid before", "freeze my card right now", "see how much I spent
on groceries this month", "apply for a €10k loan". Pick the *most common* job first, then the *highest-
stakes* one. Read the domain spec (`.planning/features/<domain>/`) and `.planning/ux/ux-flows.md` for what
the job is *meant* to involve.

## 2. Walk the built flow and count

Drive the live app (playwright-cli, authenticated). From a fixed start (logged-in home), complete the job
and record:

- **Steps** — distinct screens/views/wizard steps the user passes through.
- **Clicks / taps** — every interaction needed (include opening menus, dismissing things).
- **Fields** — inputs the user must fill or choose.
- **Decisions** — points where the user must think/choose (which account, which speed, OUR/SHA/BEN, accept
  a fee). Decisions cost more than clicks; weight them.
- **Scrolls** — how many scroll actions to reach the action(s).
- **Hand-back points** — where the flow makes the user fetch something (an IBAN, a code, a document).

Capture a screenshot at the start, at each decision, and at success.

## 3. Compare to intent and benchmark

- **Intent**: what `.planning/ux/ux-flows.md` says the flow should be. If the build adds steps the intended
  flow didn't have, that's a build regression — route to `gok-bank-ux`.
- **Benchmark**: the same job on a leading neobank for that job (Wise for FX, Revolut for cards, Monzo for
  pots, Trade Republic for invest). State the benchmark count and source-of-judgment. You're not cloning
  them — you're showing the gap is real and sized.
- **Verdict**: `at/under intent` (good — note it), `over intent` (build friction — gok-bank-ux), or
  `intent itself is heavy` (the designed flow is the problem — gok-bank-ux + product-owner; or the domain
  expert if regulation forces it).

## 4. Locate the friction, don't just total it

A high count is a symptom; the finding names the *cause* so it's fixable:

- A step that could be **collapsed** (speed + review on one screen).
- A field that could be **defaulted or remembered** (last amount, home account).
- A decision that could be **progressively disclosed** (SWIFT charge codes behind "More options").
- A **hand-back** that could be removed (scan/paste an IBAN instead of typing it).
- A **confirmation** that could be an **optimistic action + undo** (reversible, low-stakes).

## 5. Write it as a finding with the number

Example, for `ux-findings.md`:

```markdown
### PAY-U-02 · Paying a new payee takes 7 steps / 11 taps (benchmark: 4 / 6)
- **Severity:** S2 — friction on a P0 task
- **Type:** effort
- **Route:** /payments/transfer (new-payee path) → /payments/payees/new
- **The job:** pay someone I've never paid before.
- **Measured:** 7 steps, 11 taps, 5 fields, 3 decisions, 2 scrolls. Intent (ux-flows §2) = 5 steps.
  Benchmark (Wise add-recipient-and-send) ≈ 4 steps / 6 taps.
- **Friction located:** payee creation is a separate full route (could be inline in the send flow);
  the speed step is its own screen (could merge into review); the amount isn't remembered.
- **Evidence:** screenshots/PAY-U-02-step1..7.png
- **Owner:** gok-bank-ux (redesign — inline new-payee in the send flow) + gok-bank-product-owner (gate)
- **Status:** open
```

## Notes

- Count the **built** reality, including incidental friction (a dialog you must dismiss, a tooltip in the
  way). That's what the user feels.
- Don't punish *worthwhile* friction. A step-up on a large new-payee transfer adds a step but buys trust —
  call it out as *justified*, not as bloat. The skill is distinguishing the two.
- Always do a **desktop and a mobile** pass — effort and reachability differ between them, and mobile is
  usually where the thumb-reach and scroll problems surface.
