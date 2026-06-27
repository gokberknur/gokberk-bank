# Playbook — help, tickets & live chat (S01)

Deep mechanics for the `/support/*` surface — the **front door** before the heavier wizards (disputes `S02`,
claims `N03`). The whole sub-area has one posture: **self-serve first, never a dead end, never blame.**
Surface the likely answer, then make a human one tap away. This playbook is the *how*; read
`competitive-benchmarks.md` for the Revolut/Intercom bar and `regulatory-and-trust.md` for the complaints /
ombudsman framing. Scope authority: `.planning/features/support/S01-help-tickets-chat.md`.

## The self-serve ladder (build it in this order)

The order is the product, not just the IA: **article → chat → ticket**, each step a deliberate escalation,
nothing lost between them. The mechanism that holds it together is that **every rung ends with the next
one** — an article ends with "Still need help?", a chat can become a ticket, a ticket thread stays one
continuous record. Why: the dominant support job is *"answer my question without phoning anyone"*, and the
deepest fear is *being dropped or made to repeat myself*. Design against both by never terminating a path.

## Help center — search and articles

`/support` is a searchable article index: a labelled `gok-input` search filters a **seeded corpus**
(`src/lib/support/articles.ts`, pure search over `{ title, topic, body }`), with articles grouped by topic
(`gok-accordion` or category cards). An article view is **clean editorial prose** at a reading measure —
mono-uppercase topic eyebrow, sentence-case title — and **ends with a "Still need help?"** escalation to a
ticket or chat. That ending is not decoration; it is the rung to the next step. The corpus is **seeded prose,
not a CMS** — never build in-app authoring/versioning (see `scope-discipline.md`). Per the spec's open
question, in-app prose vs an external docs link is mock either way; default to in-app prose so search works.

## Raise a ticket — the textarea, attachments, validation

`/support/tickets/new` is category (`gok-select`) + subject (`gok-input`) + **description** + **attachments**
(`F09`). Two mechanics matter:

- **The description is a textarea, and the design system ships none.** Build an **app-local multiline field
  that mirrors `gok-input`'s anatomy** — visible label, the same framing, and a **reserved message line** so
  reward-early validation doesn't shift the layout. Don't reach for a raw `<textarea>` with no label; don't
  restyle `gok-input` into a fake multiline. Match the DS anatomy exactly.
- **Attachments are `F09`, type/size-guarded, mock blobs.** Screenshots/PDF only; enforce type and size and
  surface the error **reward-early** (`gok-alert`) — the moment a bad file is chosen, not on submit. Each
  attachment has an accessible name and a remove affordance. No real upload.

Validation is **reward-early, punish-late**: validate subject/description as the user works, but don't nag on
first focus. On submit, the ticket gets an id and an **"Open"** `gok-tag`. **Preserve the user's input on a
send/network failure** (`gok-alert` + retry) — losing a typed-out problem report is the cardinal support sin.

## Ticket status — the honest state machine

Status taxonomy (the spec's open question; default to this and say so): **Open → In progress → Waiting on you
→ Resolved**. Render every status by **rule + icon + text**, never colour alone — a stalled ticket must still
*read* as stalled to a colour-blind user. The honesty rule from the complaints frame: a ticket's status is
always **visible and truthful** — never a black hole, never silence, never a status that doesn't move. SLA
copy is calm and time-aware ("We'll get back to you — usually within a day"), not a canned corporate apology
("Your request is super important to us!").

- **Ticket list** (`/support/tickets`) — hairline rows or `gok-table` (id, subject, status, last update),
  filterable by status; **zero-data and filtered-empty distinct** (no tickets → "No tickets yet — search help
  or start a chat"; a filter that matches nothing → a different "No matching tickets").
- **Ticket detail** (`/support/tickets/[id]`) — a labelled message **log** with authorship (user vs support),
  the status tag, attachments, a reply box (the same app-local textarea + `F09`), and a **Reopen** affordance
  on resolved tickets. A reply appends to the thread; the user never re-explains from scratch.

## Live chat (mock) — immediacy without a backend

`/support/chat` is a mock conversational panel: message list + composer (textarea + send), a **typing
indicator**, and **seeded/canned agent replies** — never a real websocket backend (see `scope-discipline.md`).
The mechanics that make it feel real and accessible:

- New messages land in an **`aria-live="polite"`** region so a screen-reader user hears replies arrive.
- **"Turn this chat into a ticket"** so a conversation never evaporates — history becomes one continuous
  thread. Per the open question, whether close auto-creates a ticket is ask-first; default to an explicit
  "turn into ticket" action and say why (predictable, user-controlled).

## Tone — calm, trustworthy, no-blame (with examples)

Support is the brand's voice under stress; the tone *is* the trust. Make it concrete:

- **Say:** "We'll get back to you — usually within a day." / "Let's sort this out." / "Here's what happens
  next." State facts: the status, the next step, the timeframe.
- **Don't say:** "Your request is super important to us!" (noise) / "You failed to attach a valid file."
  (blame) / "Unfortunately we are unable to…" (corporate fog). No hype, no canned apology, no fault implied.
- One earned accent per surface — the single primary ("Send" / "Raise ticket"); hairline + flat everywhere
  else.

## Routing — what does NOT belong here

Support is the front door, not the catch-all. Route, don't absorb:

- **A card dispute / chargeback** → the **`S02` wizard**, never the ticket form. If a ticket subject smells
  like a disputed charge, point the user to disputes. This is the single most important support routing rule.
- **An insurance claim** → `gok-bank-insurance` (`N03`), not a ticket.
- A genuine non-card **complaint** (not a dispute, not a claim) *does* belong in support — model the
  complaints *spirit* (honest status, always a next step, escalation exists), not a regulated complaints
  engine or a real ombudsman referral.

## Edge cases

- **Send/upload failure** → preserve the typed message and chosen files; `gok-alert` + retry; never silent
  loss.
- **Resolved ticket** the user replies to → **Reopen**, don't make them file a new ticket and re-explain.
- **Attachment too large / wrong type** → reward-early `gok-alert`, the rest of the form intact.
- **Empty search** vs **search with no matches** → list everything vs a distinct "no matching articles".
- **Chat closed mid-conversation** → the "turn into ticket" path keeps history; nothing is dropped.

## Sub-area definition of done

On top of the cross-cutting `definition-of-done.md`:

- [ ] Articles are surfaced **before** the ticket form; every article ends with a "Still need help?"
      escalation to ticket or chat.
- [ ] The description field is an app-local textarea that **mirrors `gok-input`'s label + reserved-message
      anatomy** (the DS ships no textarea); attachments use `F09`, type/size-guarded, with accessible
      names + remove.
- [ ] Raising a ticket validates **reward-early** and yields an **"Open"** status tag; a send/upload failure
      **preserves input** and offers retry.
- [ ] Ticket status (Open → In progress → Waiting on you → Resolved) is by **rule + icon + text**; resolved
      tickets **reopen** without re-explaining.
- [ ] Ticket list distinguishes zero-data from filtered-empty with **different copy**.
- [ ] Chat sends and receives a seeded reply via an **`aria-live` polite** region and can be **turned into a
      ticket**.
- [ ] Copy is calm, human, **no-blame** — no hype, no canned apology, no fault implied.
- [ ] A card dispute is **routed to `S02`**, never handled by the ticket form; axe clean on form + thread +
      chat.
