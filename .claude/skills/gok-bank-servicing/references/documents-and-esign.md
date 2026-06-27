# Playbook — documents vault & e-sign (D01, D02)

Deep mechanics for the two `/documents/**` surfaces: the **vault** (the bank's single store of every
document) and **e-sign** (the app's most legally consequential micro-flow). This is the *how* under the
domain principles in the SKILL — read the cross-cutting refs (`regulatory-and-trust.md` for eIDAS levels,
`definition-of-done.md` for the ship bar) for the *why-in-general*; read this for the per-step build
contract, the state machines, and the edge cases. Specs are the scope authority:
`.planning/features/documents/D01-documents-vault.md` and `.../D02-esign.md`.

## Contents

- [The vault as single write-through (D01)](#the-vault-as-single-write-through-d01)
- [Filters, chips, and the two empties](#filters-chips-and-the-two-empties)
- [The viewer and download](#the-viewer-and-download)
- [E-sign: the four-beat legal act (D02)](#e-sign-the-four-beat-legal-act-d02)
- [The scroll-to-end gate — keyboard-satisfiable](#the-scroll-to-end-gate--keyboard-satisfiable)
- [Step-up, resume, and session-timeout safety](#step-up-resume-and-session-timeout-safety)
- [The signed copy: what lands in the vault](#the-signed-copy-what-lands-in-the-vault)
- [Edge cases](#edge-cases)
- [Sub-area definition of done](#sub-area-definition-of-done)

## The vault as single write-through (D01)

There is **exactly one** document store: the vault rune in `src/lib/documents/vault.svelte.ts`. Everything
that produces a document writes through its single `add(doc)` — **statements** (`A06`, owned by
`gok-bank-accounts`) and **signed copies** (`D02`) call the *same* path. Refuse any second store: a signing
feature that also keeps its own PDF, or an accounts feature that lists statements from its own array, forks
the truth and guarantees drift. Why this is the spine: retrieval-under-pressure (a broker waiting on a
statement) only works if "everything is in one place" is literally true.

The record shape is the contract every writer must satisfy:
`{ id, title, category, type (pdf|statement|contract|certificate), date, sizeBytes, source (feature id),
status (final|signed|awaiting-signature), signedAt?, signedBy?, contentRef }`. Insist on `source` so the
viewer can show provenance, and on the optional `signedAt/signedBy` so a signed copy carries its proof as
**fact** (never "signed ✓" with no who/when). Filtering and sorting are **pure derivations** over the seed —
never mutate the seed to filter; derive a view. Money/size formatting goes through `src/lib/format.ts`
(tabular numerals, locale grouping), never inline.

## Filters, chips, and the two empties

The toolbar is free-text search (over title + reference) + **category** facets (Statements / Contracts /
Policies / Lending / Certificates / Signed) + a **type** filter + a **date-range** filter (`F06`). Every
active filter emits a removable `gok-tag` chip beneath the toolbar; removing a chip clears exactly that
predicate and the list re-derives. The chip is the user's model of "why am I seeing this subset" — without
it, a filtered list looks like a broken one.

Hold the line on the **two distinct empties**, because conflating them is the classic vault bug:

- **Zero-data** (`gok-empty-state` "No documents yet") — the account genuinely has no documents. One calm
  headline, no "clear filters" (there's nothing to clear).
- **Filtered-empty** ("No matching documents" + a clear-filters action) — documents exist but the predicate
  hides them all. The recovery is to widen the filter, so the CTA must be clear-filters, not "add a document".

Resolve `D01`'s open question deliberately: **"Signed" is a status surfaced as a category facet**, not a
separate store — the signed copies live in the one vault and the facet filters `status === 'signed'`. Say so
when asked; don't let it become a parallel taxonomy.

## The viewer and download

The viewer (`/documents/[id]`) is a labelled, **keyboard-scrollable** region (it's reused by e-sign, so its
scroll behaviour is load-bearing — see the gate below) plus a metadata sidebar: category, date, source
feature, and `signedBy + signedAt` when present. Awaiting-signature documents surface a **Sign** action that
hands off to `D02`; final/signed documents do not. Download shows progress in the action button
(`gok-spinner`), never a blank wait. On a viewer load error, show `gok-alert` + retry with the shell intact —
never a white page. Per the spec's open question, viewer fidelity (real client-side PDF vs a styled HTML mock
preview) is **ask-first**; default to the styled mock for the demo and say why (no backend, deterministic).

## E-sign: the four-beat legal act (D02)

A signature is a legal act; treat the flow with gravity. The four beats are **non-negotiable and ordered** —
model them as an explicit session state in `src/lib/documents/sign.svelte.ts`:
`{ docId, scrolledToEnd, consented, stepUpVerified, signedAt, signer, signatureRef }`.

1. **Review** — the shared `D01` viewer in a scrollable region behind a **scroll-to-end gate** (below). A
   quiet read-progress marker (`gok-progress`) shows how far through. A mono eyebrow names the document.
2. **Consent** — a real `gok-checkbox` with explicit legal text: *"I have read and agree to [document]. I
   understand this is a legally binding electronic signature."* A `gok-alert` (info) restates plainly that
   the user is legally signing. Continue stays disabled until checked.
3. **Authenticate** — a **step-up** (`F12`, owned by `gok-bank-identity`): `gok-dialog no-dismiss` → OTP
   (`F08`) or passkey (WebAuthn sim) → resume. Cancel returns to consent with **no signature applied**.
4. **Signed** — a timestamped confirmation (signed-at, signer, reference shown as fact), the signed copy
   written via `D01.add()`, a Download action, and a link back to the originating feature.

The eIDAS frame (see `regulatory-and-trust.md`): this models an **AES-flavoured** experience — identity via
step-up, the act **tied to the specific document** (you reviewed the real doc, not a summary), and a
**retained timestamped record**. The three pillars to *convey*: intent (a deliberate, plainly-named Sign
act), consent (the explicit acknowledgement), and a retained record (the vault copy). Copy names the weight
and **never minimizes it** — no "just sign here", no hiding the legal nature behind a cheerful CTA. The final
Sign is a forced-decision act; the button reads "Sign document".

## The scroll-to-end gate — keyboard-satisfiable

This is the gate that makes an unread signature impossible — the exact weak-proof scenario eIDAS warns about.
`ScrollGate.svelte` wraps the viewer and watches scroll position; Sign stays disabled until the user reaches
the end. **The gate must be satisfiable by keyboard** — this is an accessibility *and* a legal requirement,
not a nicety: a keyboard or screen-reader user who can never reach the bottom can never sign. So:

- Satisfy on **End / PageDown / arrow paging** reaching the bottom, not only on a mouse wheel or drag. Listen
  on the scroll region's scroll position; both input paths converge on the same `scrolledToEnd = true`.
- The disabled Sign carries an **explanatory hint** ("Scroll to the end to sign"), never a silent dead
  button.
- **Short documents** that fit without scrolling are already at the bottom → mark `scrolledToEnd` true on
  mount so the gate doesn't trap a user with nothing to scroll.
- Sign requires `scrolledToEnd && consented` — **both, never one**. Re-derive the disabled state from session
  state; never let a stale flag enable it.

## Step-up, resume, and session-timeout safety

The step-up is an interceptor: signing dispatches the intent → the no-dismiss dialog → on success
`stepUpVerified = true` and the flow resumes to "Signed"; on cancel/decline it returns to consent and applies
**no** signature (no partial state, no side effect). We *consume* step-up; `gok-bank-identity` owns it.

**Session-timeout mid-flow must be safe.** Persist the signing session to a draft token so a timeout (or a
refresh) **resumes at the reached step with scroll and consent state restored** — a user who read a 40-page
mortgage agreement and timed out at consent must not be forced to re-scroll. The one thing that **never**
persists across a resume is `stepUpVerified`: re-authentication is always required at the moment of signing,
because that is what ties identity to the act. Resume restores progress; it does not pre-authorise the
signature.

## The signed copy: what lands in the vault

On success, write **one** record through `D01.add()`: `status: 'signed'`, `signedAt` (ISO timestamp),
`signedBy` (signer), `signatureRef` (the deterministic mock token), `source` (the e-sign feature). It is
**immutable once written** — re-opening an already-signed document shows the existing copy + timestamp, **not
a fresh gate** (this is `D02`'s open question; default to no re-sign, show the copy, and say why: a retained
record shouldn't be silently overwritten). The signature itself is a deterministic mock token + ISO timestamp
— we evoke AES, we don't wire real PKI (see `scope-discipline.md`). Download is available immediately.

## Edge cases

- **Already-signed on entry** → short-circuit the wizard to the signed view (copy + timestamp + download); no
  scroll gate, no consent, no step-up.
- **Step-up cancelled** → back to consent, session unchanged except `stepUpVerified` stays false; no toast of
  "failure", no blame.
- **Viewer load error inside review** → `gok-alert` + retry; the gate cannot be satisfied on a document that
  didn't render (don't enable Sign on an error state).
- **Filtered-empty vs zero-data** in the vault — keep distinct (above); the most common review bug.
- **A statement appended via `A06`** must appear in the vault list without a second store — test the `add()`
  path, not just the seed.
- **Download mid-flight** → spinner in the button; a second click is a no-op while in progress.

## Sub-area definition of done

On top of the cross-cutting `definition-of-done.md`:

- [ ] One `add()` path proven: a doc added via `add()` (simulating `A06`/`D02`) shows in the list — no second
      store anywhere.
- [ ] Vault distinguishes zero-data from filtered-empty with **different copy**; chips are removable and
      clearing restores the list.
- [ ] Signed copies show `signedBy + signedAt` as fact; awaiting-signature offers Sign; final does not.
- [ ] Sign is disabled until **scroll-to-end AND consent** — both — and the gate is satisfiable by **keyboard**
      (End/PageDown), with a hint on the disabled button.
- [ ] Short docs that don't scroll enable the gate on mount; step-up is required and decline applies **no**
      signature.
- [ ] Session-timeout resumes at the reached step with scroll/consent restored; `stepUpVerified` never
      persists across resume.
- [ ] An already-signed document shows the existing copy, not a fresh gate; the signed copy is immutable and
      downloadable.
- [ ] axe clean on list + viewer + review + signed; viewer region labelled and keyboard-scrollable.
