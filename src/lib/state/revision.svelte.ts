// A tiny shared reactive signal. The F03 data layer mutates its in-memory spine
// and balances at runtime (a send appends a pending row, a cancel removes it),
// but those plain mutations don't notify Svelte. Every state getter that reads
// the spine touches `revision.value` to take a reactive dependency on it, and a
// mutation calls `revision.bump()` so all dependent getters re-run and every
// surface re-renders. One signal, app-wide — the seam between "the data changed"
// and "the screen reacts".

class Revision {
	value = $state(0);

	/** Bump after any runtime mutation of the data spine so dependent getters re-run. */
	bump() {
		this.value++;
	}
}

export const revision = new Revision();
