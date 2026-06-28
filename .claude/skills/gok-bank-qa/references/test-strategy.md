# Test strategy — what to test, in what order, and the SPA caveats

The job is not "click everything." It's to spend the limited testing budget where a defect costs the most
trust or money, and to know the traps this specific stack sets so you don't file false positives (or miss
real ones).

## Risk-based prioritization

Rank every surface before testing it. Test top-down.

| Tier | What | Examples | Why |
|------|------|----------|-----|
| **P0** | Money moves, irreversibly | send/transfer, exchange (FX), card freeze/cancel, loan/mortgage/credit submit, standing-order create, crypto transfer | A defect here loses money or trust. Test first, hardest, and lock with E2E. |
| **P1** | Money/identity changes, reversible or guarded | pots move, payee add, scheduled edit, 2FA/passkey enrol, KYC step, dispute raise, e-sign | Wrong behaviour is recoverable but damaging. |
| **P2** | Read surfaces with real numbers | accounts ledger, balances, portfolio, statements, budgets, activity | Wrong numbers erode trust even when nothing "breaks". Verify the data, not just the render. |
| **P3** | Discovery / config | explore funds, rewards browse, settings, appearance, notifications | Lower blast radius; still must not throw or strand the user. |

## The money spine is P0 everywhere

Every value flow follows the same spine — test each phase:

- **gather** — validate as the user types (reward early): bad IBAN, insufficient funds, age gate, amount
  over limit. Confirm errors appear *before* submit, say what happened + what to do, and don't shift layout.
- **review** — the trust signals (fee, rate, ETA, who-sees-what) must be shown *before* commit and must
  **match what actually commits**. Disclosed €2.50 fee → the ledger must move €2.50. This is the single
  highest-value check in the app.
- **forced-decision confirm** — irreversible actions end on a `gok-dialog tone="danger" no-dismiss`.
  Confirm it can't be dismissed by backdrop/escape, that declining has no side effect, and that confirming
  once doesn't double-submit (double-click, double-enter).
- **success with reversibility** — the success state is honest (not faked while still pending), shows the
  real new balance/state, and offers undo where the action is reversible.

Force the unhappy paths too: commit, then simulate failure (chrome-devtools network throttle/offline or a
mocked failure) — the flow must recover without double-charging or stranding the user in a half state.

## Data integrity — money is integer minor units

- Money is stored and computed in **integer minor units** (cents), never floats. Watch for `0.1 + 0.2`
  drift, rounding that loses a cent, or a display that groups wrong (`1,234.50` vs `1234.5`).
- Cross-check: the amount entered, the amount disclosed on review, the amount that moves on the ledger, and
  the receipt must all agree to the cent.
- FX: the rate shown, the converted amount, and any spread/fee must reconcile. A wrong FX render is a P0
  data-integrity defect.

## State coverage — open every state

For every surface, deliberately reach and verify:

- **Empty** — both zero-data (no payees yet) *and* filtered-to-zero (search matches nothing). They're
  different states; both must exist and read sensibly.
- **Loading** — a skeleton mirroring the final layout, not a spinner on a blank page, and not a layout
  shift when data lands.
- **Inline error** — field-level, reward-early, no-blame, reserved line (no shift).
- **Page error** — a fetch/load failure shows a real recovery, not a white screen or a raw stack.
- **Pending** — honest "in progress / verifying…" — never faked completion.

## The stack's traps (don't file false positives — or miss real ones)

This is a **client-only SPA** (`ssr=false`) of **Lit web components**. Behaviours that look like bugs but
aren't — and real bugs the stack hides:

- **No SSR / hydration.** First paint is blank until JS registers the elements. A blank flash on hard
  navigation is expected; a *permanent* blank is a defect. Always wait for the element to register
  (`wait_for` text/role) before asserting.
- **Shadow DOM.** The real `<input>`/`<button>` lives inside the custom element's shadow root. You target
  the host by role/text; you generally can't reach inner nodes by CSS from the page. If a value won't read,
  it may be shadow-encapsulated, not missing.
- **Custom-event wiring.** Actions fire through `on('click', …)` / `addEventListener` attachments +
  `goto()`, **not** `<a href>` or `onclick`. So: a "button" with no `href` is normal; selecting by `href`
  will fail. Select by **role, visible text, or `data-testid`**.
- **Controlled-selection reopen gotcha (`gok-table`).** Opening a row uses `gok-selection-change`; after a
  detail drawer closes, the table may still hold the row in its selection set, so clicking the **same** row
  again emits nothing and the drawer won't reopen — *unless* selection is driven as a controlled prop and
  cleared on close. If "click row → drawer" works once but not twice, that's the known bug (dogfooding #12),
  not your test being flaky.
- **Invalid enum props fail silently.** A `gok-button variant="ghost"` (invalid) silently falls back to
  `primary` — so a "quiet" action renders as a second solid-green accent button. `npm run check` won't
  catch it; only a visual pass will (dogfooding #18). Treat "two primary buttons in one context" as a
  defect to verify.
- **No indeterminate progress.** `gok-progress` is determinate-only by design; an unknown-duration wait
  uses `gok-spinner`. A spinner where you expected a bar is not necessarily a bug.

## Selector strategy (for both live driving and committed specs)

Order of preference: **role + accessible name** → **visible text** → **`data-testid`** → structural
(last resort, brittle). Never `href`. When a control genuinely can't be reached by role/text/testid,
that's a finding to hand to the Svelte MCP (add a minimal `data-testid`), not a reason to write a brittle
nth-child selector.
