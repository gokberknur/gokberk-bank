import { readJSON, writeJSON } from '$lib/state/persist';
import { feed } from '$lib/state/feed.svelte';
import { toast } from '$lib/state/toasts.svelte';
import { INSTRUMENTS } from '$lib/data/market';
import { TODAY } from '$lib/data/time';
import { formatMoney } from '$lib/format';
import {
	quoteFor,
	crossed,
	alertId,
	type PriceAlert,
	type AlertCondition,
	type AlertMode
} from '$lib/invest/alert-engine';

const STORAGE_KEY = 'invest-alerts';
const MAX_PER_SYMBOL = 5;
const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));
const KNOWN = new Set(INSTRUMENTS.map((i) => i.symbol));

// Seed examples shown ONLY on the very first load (nothing persisted): one in-band armed alert
// that fires on the mount pass (proving the seed fire path, network-off), and one out-of-band
// armed target so the manage list shows both an Armed and (after the mount fire) a Fired example.
const SEED: PriceAlert[] = [
	{ id: alertId('AAPL', 'above', 21200), symbol: 'AAPL', condition: 'above', thresholdMinor: 21200, mode: 'once', status: 'armed', createdAt: TODAY.toISOString() },
	{ id: alertId('ASML', 'above', 95000), symbol: 'ASML', condition: 'above', thresholdMinor: 95000, mode: 'once', status: 'armed', createdAt: TODAY.toISOString() }
];

/** Read persisted alerts (seed on first-ever load), dropping any whose symbol left the universe. */
function load(): PriceAlert[] {
	const stored = readJSON<PriceAlert[]>(STORAGE_KEY, SEED);
	return Array.isArray(stored) ? stored.filter((a) => a && KNOWN.has(a.symbol)) : SEED;
}

class Alerts {
	/** The user's alerts (persisted). Reassigned immutably so rune reads re-flow. */
	list = $state<PriceAlert[]>(load());

	#save() {
		writeJSON(STORAGE_KEY, this.list);
	}

	all(): PriceAlert[] {
		return this.list;
	}
	forSymbol(symbol: string): PriceAlert[] {
		return this.list.filter((a) => a.symbol === symbol);
	}
	countFor(symbol: string): number {
		return this.forSymbol(symbol).length;
	}
	get(id: string): PriceAlert | undefined {
		return this.list.find((a) => a.id === id);
	}

	/** A blocking validation message, or null when OK to create. */
	guard(symbol: string, condition: AlertCondition, thresholdMinor: number): string | null {
		const inst = BY_SYMBOL.get(symbol);
		if (!inst) return 'Choose an instrument.';
		if (!Number.isFinite(thresholdMinor) || thresholdMinor <= 0) return 'Enter a price above zero.';
		if (thresholdMinor === inst.lastPriceMinor)
			return 'That’s the current price — set a level above or below it.';
		if (this.get(alertId(symbol, condition, thresholdMinor)))
			return 'You already have that exact alert.';
		if (this.countFor(symbol) >= MAX_PER_SYMBOL)
			return `You already have ${MAX_PER_SYMBOL} alerts on ${symbol}.`;
		return null;
	}

	/** A non-blocking note when the level is on the side the price has ALREADY passed (it won't
	 *  fire until the price crosses it again). Neutral, factual — never a nudge. */
	crossingNote(symbol: string, condition: AlertCondition, thresholdMinor: number): string | null {
		const inst = BY_SYMBOL.get(symbol);
		if (!inst) return null;
		const last = inst.lastPriceMinor;
		if (condition === 'above' && last >= thresholdMinor)
			return `${symbol} is already above this level — you’ll be alerted if it crosses it again.`;
		if (condition === 'below' && last <= thresholdMinor)
			return `${symbol} is already below this level — you’ll be alerted if it crosses it again.`;
		return null;
	}

	#describe(a: PriceAlert): string {
		const inst = BY_SYMBOL.get(a.symbol);
		const level = inst ? formatMoney(a.thresholdMinor, inst.currency) : '';
		return `${a.symbol} ${a.condition} ${level}`;
	}

	/** Fire an alert through F13 if it crosses now; flip status; persist. Returns whether it fired.
	 *  `once` → fired; `repeating` → stays armed but `firedAt` guards a re-fire (dormant on the seed). */
	#fireIfCrossed(alert: PriceAlert, opts: { toast: boolean }): boolean {
		if (alert.status === 'muted' || alert.firedAt) return false;
		const q = quoteFor(alert.symbol);
		if (!q || !crossed(alert.condition, alert.thresholdMinor, q)) return false;
		const inst = BY_SYMBOL.get(alert.symbol);
		const level = inst ? formatMoney(alert.thresholdMinor, inst.currency) : '';
		feed.notify({
			type: 'market',
			status: 'info',
			title: `${alert.symbol} is ${alert.condition} ${level}`,
			body: 'A price alert you set has been reached.',
			source: { label: `View ${alert.symbol}`, route: `/invest/instrument/${alert.symbol}` },
			toast: opts.toast
		});
		this.list = this.list.map((a) =>
			a.id === alert.id
				? { ...a, firedAt: TODAY.toISOString(), status: a.mode === 'once' ? ('fired' as const) : ('armed' as const) }
				: a
		);
		this.#save();
		return true;
	}

	/** Arm a new alert. If its level is already crossed by the seed's session move it fires
	 *  immediately (with a toast — the user just acted); otherwise it's armed with a set+undo toast. */
	create(input: { symbol: string; condition: AlertCondition; thresholdMinor: number; mode: AlertMode }): void {
		const { symbol, condition, thresholdMinor, mode } = input;
		if (this.guard(symbol, condition, thresholdMinor)) return; // defensive — the form blocks first
		const id = alertId(symbol, condition, thresholdMinor);
		const alert: PriceAlert = { id, symbol, condition, thresholdMinor, mode, status: 'armed', createdAt: TODAY.toISOString() };
		this.list = [alert, ...this.list];
		this.#save();
		const fired = this.#fireIfCrossed(alert, { toast: true });
		if (!fired) {
			toast(`Alert set — ${this.#describe(alert)}`, {
				status: 'success',
				action: { label: 'Undo', onClick: () => this.#removeSilent(id) }
			});
		}
	}

	/** The quiet mount pass: fire any armed, never-fired, in-band alert with a feed line but NO
	 *  toast (a load-time toast storm would be noise). Snapshot first — firing mutates the list. */
	evaluateArmed(): void {
		for (const a of [...this.list]) this.#fireIfCrossed(a, { toast: false });
	}

	mute(id: string): void {
		const a = this.get(id);
		if (!a || a.status === 'muted') return;
		const prevStatus = a.status;
		const prevFired = a.firedAt;
		this.list = this.list.map((x) => (x.id === id ? { ...x, status: 'muted' as const } : x));
		this.#save();
		toast(`Muted ${a.symbol}`, {
			status: 'neutral',
			action: { label: 'Undo', onClick: () => this.#setStatusSilent(id, prevStatus, prevFired) }
		});
	}

	/** Arm (or re-arm) an alert — clears `firedAt` so a fired one can fire again. */
	arm(id: string): void {
		const a = this.get(id);
		if (!a || a.status === 'armed') return;
		const prevStatus = a.status;
		const prevFired = a.firedAt;
		this.list = this.list.map((x) => (x.id === id ? { ...x, status: 'armed' as const, firedAt: undefined } : x));
		this.#save();
		toast(`Armed ${a.symbol}`, {
			status: 'neutral',
			action: { label: 'Undo', onClick: () => this.#setStatusSilent(id, prevStatus, prevFired) }
		});
	}

	remove(id: string): void {
		const a = this.get(id);
		if (!a) return;
		const snapshot = a;
		this.list = this.list.filter((x) => x.id !== id);
		this.#save();
		toast(`Deleted ${a.symbol} alert`, {
			status: 'neutral',
			action: {
				label: 'Undo',
				onClick: () => {
					this.list = [snapshot, ...this.list.filter((x) => x.id !== snapshot.id)];
					this.#save();
				}
			}
		});
	}

	#removeSilent(id: string): void {
		this.list = this.list.filter((x) => x.id !== id);
		this.#save();
	}
	#setStatusSilent(id: string, status: PriceAlert['status'], firedAt: string | undefined): void {
		this.list = this.list.map((x) => (x.id === id ? { ...x, status, firedAt } : x));
		this.#save();
	}
}

export const alerts = new Alerts();
export type { PriceAlert, AlertCondition, AlertMode } from '$lib/invest/alert-engine';
