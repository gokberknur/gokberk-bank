// Seeded pseudo-random number generator — the root of all determinism in the
// mock-data layer. The same seed produces byte-identical data on every run and
// every machine, so demos, screenshots, and tests are reproducible.
//
// No `Math.random()` and no `Date.now()` anywhere in the data layer: time is
// passed in as a fixed anchor (see TODAY in time.ts), randomness flows only from
// a PRNG created with an explicit seed.

/** mulberry32 — a tiny, fast, well-distributed 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A small stateful random source with the helpers the generators need. */
export class Rng {
	private next: () => number;

	constructor(seed: number) {
		this.next = mulberry32(seed);
	}

	/** Float in [0, 1). */
	float(): number {
		return this.next();
	}

	/** Integer in [min, max] inclusive. */
	int(min: number, max: number): number {
		return min + Math.floor(this.next() * (max - min + 1));
	}

	/** Float in [min, max). */
	range(min: number, max: number): number {
		return min + this.next() * (max - min);
	}

	/** Pick one element of a non-empty array. */
	pick<T>(items: readonly T[]): T {
		return items[Math.floor(this.next() * items.length)];
	}

	/** True with probability `p`. */
	chance(p: number): boolean {
		return this.next() < p;
	}

	/** A weighted pick: `weights` parallel to `items`, need not sum to 1. */
	weighted<T>(items: readonly T[], weights: readonly number[]): T {
		const total = weights.reduce((s, w) => s + w, 0);
		let r = this.next() * total;
		for (let i = 0; i < items.length; i++) {
			r -= weights[i];
			if (r < 0) return items[i];
		}
		return items[items.length - 1];
	}

	/** A roughly-normal value (sum of uniforms), clamped to [min, max]. */
	gaussian(mean: number, stddev: number, min: number, max: number): number {
		const u = (this.next() + this.next() + this.next() + this.next()) / 4 - 0.5;
		return Math.min(max, Math.max(min, mean + u * stddev * 3.46));
	}
}
