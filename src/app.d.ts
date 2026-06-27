// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// `slot` is a valid global HTML attribute but is missing from Svelte's
// `SVGAttributes`, so slotting an `<svg slot="icon">` into a gok-* web
// component (e.g. gok-button, gok-input) trips svelte-check. Add it back.
declare module 'svelte/elements' {
	interface SVGAttributes<T> {
		slot?: string | undefined | null;
	}
}

export {};
