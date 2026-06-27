// Pure series helpers for the charts (F11). Everything is derived from the F03
// spine so chart snapshots are deterministic. Money stays in integer minor units;
// the chart wrappers format for display. No chart logic here — just the numbers.

import { getWallets, getTransactions, getPotsTotalEurMinor } from '$lib/data';
import { toEur } from '$lib/data/money';
import { TODAY, isoDate } from '$lib/data/time';
import { CATEGORY_LABELS } from '$lib/data/categories';
import type { Transaction, Category } from '$lib/data/types';

export interface NamedValue {
	name: string;
	/** Minor units. */
	value: number;
}

export interface SeriesPoint {
	/** ISO date (YYYY-MM-DD). */
	date: string;
	/** EUR minor units. */
	value: number;
}

/**
 * Outflow total by category for a set of transactions, biggest first, collapsed
 * to the top `limit` slices + an "Other" remainder. Inflows are ignored (this is
 * a spend breakdown). Values are positive minor units.
 */
export function categoryBreakdown(txns: Transaction[], limit = 6): NamedValue[] {
	const byCat = new Map<Category, number>();
	for (const t of txns) {
		if (t.amountMinor >= 0) continue;
		byCat.set(t.category, (byCat.get(t.category) ?? 0) - t.amountMinor);
	}
	const sorted = [...byCat.entries()]
		.map(([cat, value]) => ({ name: CATEGORY_LABELS[cat], value }))
		.sort((a, b) => b.value - a.value);
	if (sorted.length <= limit) return sorted;
	const top = sorted.slice(0, limit - 1);
	const other = sorted.slice(limit - 1).reduce((s, x) => s + x.value, 0);
	return [...top, { name: 'Other', value: other }];
}

/**
 * Net worth (all wallets converted to EUR + pots) sampled weekly over the last
 * `weeks` weeks. Each wallet's balance as-of a week is the running settled balance
 * of its latest settled row on or before that date; pots are added as a constant
 * baseline (they carry no history in the mock). Deterministic from the spine.
 */
export function netWorthSeriesEur(weeks = 12): SeriesPoint[] {
	const wallets = getWallets();
	const all = getTransactions();
	const perWallet = wallets.map((w) => ({
		currency: w.currency,
		points: all
			.filter((t) => t.walletId === w.id && t.status === 'settled')
			.map((t) => ({ date: t.date, bal: t.runningBalanceMinor }))
			.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
	}));
	const potsEur = getPotsTotalEurMinor();

	const out: SeriesPoint[] = [];
	for (let i = weeks - 1; i >= 0; i--) {
		const d = new Date(TODAY);
		d.setDate(d.getDate() - i * 7);
		const dateIso = isoDate(d);
		let sum = potsEur;
		for (const { currency, points } of perWallet) {
			let bal = points.length ? points[0].bal : 0;
			for (const p of points) {
				if (p.date <= dateIso) bal = p.bal;
				else break;
			}
			sum += toEur(bal, currency);
		}
		out.push({ date: dateIso, value: sum });
	}
	return out;
}

/** A single wallet's settled balance sampled over the last `days` days (minor units,
 *  the wallet's own currency) — for an inline sparkline on a wallet/card row. */
export function balanceSparkline(walletId: string, days = 30): number[] {
	const points = getTransactions()
		.filter((t) => t.walletId === walletId && t.status === 'settled')
		.map((t) => ({ date: t.date, bal: t.runningBalanceMinor }))
		.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
	const out: number[] = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(TODAY);
		d.setDate(d.getDate() - i);
		const dateIso = isoDate(d);
		let bal = points.length ? points[0].bal : 0;
		for (const p of points) {
			if (p.date <= dateIso) bal = p.bal;
			else break;
		}
		out.push(bal);
	}
	return out;
}
