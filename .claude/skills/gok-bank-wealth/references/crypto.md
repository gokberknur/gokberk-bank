# Sub-area playbook — Crypto wallet (V07)

The deep, narrow guidance for the **crypto** surface: holdings, per-asset price charts, buy/sell, and
send/receive. It mirrors the investing surfaces' rigour but adds the failure mode unique to crypto: **an
on-chain send is irreversible — the wrong network or wrong address loses the funds permanently.** That single
fact reshapes the send flow. Everything else is V03's spine in a new currency.

Spec: `.planning/features/invest/V07-crypto-wallet.md` (read first). For the MiCA / custody / irreversibility
framing, see `references/regulatory-and-trust.md`; for the bar, `references/definition-of-done.md`. Apply them —
don't restate them.

## Custody & MiCA framing (the posture, applied)

Treat balances as **custodial, demo-style** — the app holds the keys. **Do not** imply self-custody, seed
phrases, DeFi, staking, or bridging; those are out of scope (`references/scope-discipline.md`). The MiCA cue is
a serious, plain risk posture, not scare-mongering: **"Crypto is volatile; you can lose money."** Spot crypto
only — no leverage, no perpetuals.

## Holdings & balances

Route `/crypto`. A balances grid/cards: asset · units (in the asset's own decimals) · last price · day change
(rule+sign+icon) · value (home ccy via FX). A total-crypto-value header. Primaries: **Buy / Send / Receive**.

- **Amounts are integer base units at the asset's decimals** (e.g. 8 for BTC, 18 for ETH) — never a float.
  Float-summing crypto balances is the precision bug that makes a total wrong in the last places.
- **Value in home ccy** converts through a **disclosed scaled-integer FX rate** — instrument (crypto) ccy vs
  the home wallet ccy, same rule as every other invest surface.
- Asset detail (`/crypto/[symbol]`): an `F11` price chart with ranges (data-table fallback), key facts, the
  user's position, and Buy/Sell/Send/Receive.

## Buy / Sell — V03's spine, simpler

A `gok-drawer` ticket like the order ticket but lighter: amount in **crypto units or home-ccy** (`F07`), a live
cost preview (price, fee, FX, **spendable**), review → **forced-decision confirm** → done. Prices are
**indicative**; carry "Crypto is volatile." Buy/Sell are **not** colour-coded — the side segment + label
carries direction. Insufficient balance **blocks reward-early**. Whether crypto buying power is a dedicated cash
balance or the home EUR wallet is an **ask-first** decision.

## Receive — address + local QR

Show the wallet **address** + a **QR rendered locally** (a tiny app-local matrix builder, **monochrome** via
token colours — no new DS component, no remote image), a **copy** action, and the selected **network** with a
plain caution: **"Send only <ASSET> on <NETWORK> to this address."** The QR always has a **text-address
alternative + copy** — it's never the only way to get the address (a11y). Sending the wrong asset/network to a
right-looking address still loses the funds, so the network is named here too.

## Send — the irreversibility gate (the headline)

Route `/crypto/transfer`. This is the one flow where the crypto-specific risk lives. Build it as a deliberate,
confirmed act:

1. **Recipient address** — paste/scan, with **format + checksum validation reward-early** (an invalid address
   blocks before anything else). Per-network checksum (EIP-55-style) vs a length/charset format check is an
   **ask-first** depth decision; reward-early validation is fixed regardless.
2. **Network select** — and **infer the network from the address shape**; if the address suggests a *different*
   network than the one selected, **warn** (network-mismatch). This is the wrong-network catch.
3. **Amount** (`F07`) — in base units; insufficient balance blocks reward-early.
4. **Live network-fee estimate** — disclosed before confirm (a fee-spike note when relevant).
5. **Review ledger** → **the forced-decision network confirm**: a `gok-dialog tone="danger" no-dismiss` that
   **names the network** and states the truth plainly — **"You're sending on <NETWORK>. Sends can't be
   reversed. The address and network must be correct."** Plus **step-up (`F12`)** over a threshold. A declined
   step-up leaves state unchanged.
6. **Done** → **Pending → Confirming**, on-chain-style.

Never send before this confirm. Never make the warning soft or dismissible — a dismissible warning is the
Bitpanda-grade mistake this whole flow exists to avoid. The dialog must be a forced decision that names the
network.

## Honest settlement — Pending → Confirming, never instant

A send is **Pending → Confirming** with a **truncated tx hash + a confirmations count** — *never* instantly
"Confirmed". Faking an instant confirmation is the crypto equivalent of faking a Fill on a closed market: it
lies about finality. Settlement progresses deterministically from the mock.

## Activity — the on-chain-style ledger

A `gok-table`: time · type (buy/sell/send/receive) · asset · amount · **status** (Pending / Confirming /
Confirmed / Failed, by **rule+mark+text**, never colour-only) · a **truncated tx hash** · confirmations count.
`columns`/`rows` as DOM **properties**, sortable `role="grid"`, **no `bind:`**, tabular numerals.

## Edge cases this surface must handle

- **Empty** (no crypto) → `gok-empty-state` "No crypto yet. Buy your first."
- **Invalid address** → reward-early `gok-alert`, send blocked.
- **Network mismatch** → warn when the address shape suggests a different network.
- **Insufficient balance** → block reward-early.
- **Fee spike** → a note before confirm.
- **Send in flight** → Pending → Confirming (never a premature Confirmed).
- **Error** → `gok-alert` + retry, no blame.
- **Step-up declined** → no side effect.

## Competitive bar

**Bitpanda** is the crypto+brokerage benchmark for buy/sell with a slippage control and broad coverage — but
its fees are buried in the spread; **we disclose the fee + FX margin as line items** and label every price
indicative. The serious exchanges all gate a send behind a forced network confirmation naming the network +
irreversibility, with a copy-able address + QR on receive — match that, and beat them on cost transparency. See
`references/competitive-benchmarks.md`.

## Sub-area definition of done

- [ ] Holdings show units (asset decimals) + home-ccy value via **disclosed FX**, day change by rule+sign+icon;
      total header correct; all amounts integer base units (no float).
- [ ] Asset detail renders a ranged price chart **with a data-table fallback** and the user's position.
- [ ] Buy/Sell ticket previews price, fee, FX, spendable; confirm is a **forced-decision**; over-threshold →
      step-up; Buy/Sell not colour-coded; insufficient balance blocks reward-early.
- [ ] Receive shows the address, a **locally-rendered monochrome QR**, copy, and a "send only <ASSET> on
      <NETWORK>" caution, with a text-address alternative.
- [ ] Send validates the address **reward-early**, infers + warns on a **network mismatch**, estimates the
      network fee, and **forces a network-confirmation dialog naming the network + irreversibility** before any
      funds move; step-up over threshold; decline = no change.
- [ ] Settlement is **Pending → Confirming** with a truncated tx hash + confirmations — never instant Confirmed.
- [ ] Activity lists buy/sell/send/receive with status by rule+mark+text, a truncated hash, confirmations.
- [ ] Custodial framing only (no seed phrase / self-custody); axe clean on send dialog + receive + grids;
      `columns`/`rows` set as properties; minor/base-unit + scaled-int math throughout.
