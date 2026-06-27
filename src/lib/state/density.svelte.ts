// UI density (comfortable | compact) — a DS-shared choice. It manages its own
// `gok-density` localStorage key directly (NOT via persist.ts / the `gok-bank-`
// prefix) so the design-system components and this app stay on one switch, and
// mirrors the `data-density` attribute the DS reads off `<html>`.

import { browser } from '$app/environment';

export type Density = 'comfortable' | 'compact';

const STORAGE_KEY = 'gok-density';

class DensityState {
	current = $state<Density>('comfortable');

	constructor() {
		if (!browser) return;
		const fromDom = document.documentElement.dataset.density === 'compact' ? 'compact' : undefined;
		const fromStorage = localStorage.getItem(STORAGE_KEY) as Density | null;
		this.current = fromDom ?? fromStorage ?? 'comfortable';
		window.addEventListener('storage', (e) => {
			if (e.key !== STORAGE_KEY || e.newValue == null) return;
			this.current = e.newValue as Density;
			this.#applyToDom(e.newValue as Density);
		});
	}

	#applyToDom(d: Density) {
		if (d === 'compact') document.documentElement.dataset.density = 'compact';
		else delete document.documentElement.dataset.density;
	}

	set(d: Density) {
		this.current = d;
		if (browser) {
			this.#applyToDom(d);
			localStorage.setItem(STORAGE_KEY, d);
		}
	}

	toggle() {
		this.set(this.current === 'comfortable' ? 'compact' : 'comfortable');
	}
}

export const density = new DensityState();
