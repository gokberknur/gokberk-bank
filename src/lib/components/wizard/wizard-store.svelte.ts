// The wizard/stepper composite's state model (F05) — a rune class that owns the
// step-state the design system has no primitive for: which step is current, which
// have been visited, the flow's mutable `data`, and the active step-level error.
// Flows declare `steps[]` + `validate`/`canEnter`; this store enforces the
// forward-only-when-valid contract and persists a localStorage draft so a user
// never loses their place. The Wizard.svelte shell reads the getters and calls the
// intent methods; it never reaches into the fields directly.

import { browser } from '$app/environment';
import type { StepDef, WizardOptions, StepValidation } from './types';

/** localStorage draft key prefix; the flow id completes it. */
const DRAFT_KEY_PREFIX = 'gok-bank-wizard-';

/** The shape we persist (and try to hydrate) per flow. */
interface WizardDraft<TData> {
	currentIndex: number;
	data: TData;
}

export class Wizard<TData = Record<string, unknown>> {
	/** The flow's ordered steps (from options; not reactive — the list is fixed). */
	readonly steps: StepDef<TData>[];

	/** The active step index. */
	currentIndex = $state(0);
	/** The flow's mutable data object — fields write into this; persisted as a draft. */
	data = $state<TData>({} as TData);
	/** Per-step "has the user reached this step?" — drives the rail's reachable/marked state. */
	visited = $state<boolean[]>([]);
	/** The active step-level error: a message string, a field-map, or none. */
	error = $state<string | Record<string, string> | null>(null);

	readonly #key: string;
	readonly #persistEnabled: boolean;

	constructor(opts: WizardOptions<TData>) {
		this.steps = opts.steps;
		this.data = opts.initialData;
		this.visited = opts.steps.map((_, i) => i === 0);
		this.#key = DRAFT_KEY_PREFIX + opts.flowId;
		this.#persistEnabled = opts.persist !== false;

		// Hydrate a saved draft on the client only (localStorage is browser-only, and
		// SSR is off for this app anyway). A corrupt/absent draft starts fresh.
		if (browser && this.#persistEnabled) {
			try {
				const raw = localStorage.getItem(this.#key);
				if (raw) {
					const saved = JSON.parse(raw) as Partial<WizardDraft<TData>>;
					if (saved.data) {
						this.data = { ...this.data, ...saved.data };
					}
					if (
						typeof saved.currentIndex === 'number' &&
						saved.currentIndex >= 0 &&
						saved.currentIndex < this.steps.length
					) {
						this.currentIndex = saved.currentIndex;
						// Everything up to the restored step is, by definition, visited —
						// so deep-linking back into a flow keeps earlier steps reachable.
						for (let i = 0; i <= saved.currentIndex; i++) this.visited[i] = true;
					}
				}
			} catch {
				// Ignore unreadable drafts — the flow simply starts at step 0.
			}
		}
	}

	/** The active step definition. */
	get current(): StepDef<TData> {
		return this.steps[this.currentIndex];
	}

	/** Whether the active step is the first. */
	get isFirst(): boolean {
		return this.currentIndex === 0;
	}

	/** Whether the active step is the last. */
	get isLast(): boolean {
		return this.currentIndex === this.steps.length - 1;
	}

	/** 1-based position of the active step (the "k" in "k of N"). */
	get stepNumber(): number {
		return this.currentIndex + 1;
	}

	/** Total number of steps (the "N"). */
	get total(): number {
		return this.steps.length;
	}

	/**
	 * Validate the current step and advance. Returns `false` (and surfaces the
	 * error) when the step blocks; `true` when it advances or is already last.
	 * Reward-early: `validate` may return a message or a field-map to block.
	 */
	goNext(): boolean {
		// The final step's submit is the flow's onComplete; nothing to advance to.
		if (this.isLast) return true;

		const result: StepValidation | undefined = this.current.validate?.(this.data);
		// Block on anything that isn't an explicit pass (`true` or omitted).
		if (result !== undefined && result !== true) {
			this.error = result;
			return false;
		}

		this.error = null;
		this.visited[this.currentIndex] = true;

		// Advance to the next step that isn't guarded out by `canEnter`.
		let next = this.currentIndex + 1;
		while (next < this.steps.length && this.steps[next].canEnter?.(this.data) === false) {
			next++;
		}
		if (next < this.steps.length) {
			this.currentIndex = next;
			this.visited[next] = true;
		}
		this.#persist();
		return true;
	}

	/** Step back to the previous enterable step. Never validates — going Back is free. */
	goBack(): void {
		this.error = null;
		let prev = this.currentIndex - 1;
		while (prev >= 0 && this.steps[prev].canEnter?.(this.data) === false) prev--;
		if (prev >= 0) {
			this.currentIndex = prev;
			this.#persist();
		}
	}

	/**
	 * Jump directly to `index` — only allowed for a step that's already behind us
	 * or visited, and not guarded out. Used by the rail; out-of-reach steps no-op.
	 */
	goTo(index: number): void {
		if (index === this.currentIndex) return;
		const reachable = index <= this.currentIndex || this.visited[index] === true;
		if (!reachable) return;
		if (this.steps[index]?.canEnter?.(this.data) === false) return;
		this.error = null;
		this.currentIndex = index;
		this.#persist();
	}

	/** Remove the persisted draft (e.g. on flow completion or an explicit reset). */
	clearDraft(): void {
		if (!browser) return;
		try {
			localStorage.removeItem(this.#key);
		} catch {
			// Nothing to clean up if storage is unavailable.
		}
	}

	/** Write the current `{ currentIndex, data }` draft, browser-guarded. */
	#persist(): void {
		if (!this.#persistEnabled || !browser) return;
		try {
			const draft: WizardDraft<TData> = {
				currentIndex: this.currentIndex,
				data: $state.snapshot(this.data) as TData
			};
			localStorage.setItem(this.#key, JSON.stringify(draft));
		} catch {
			// A full/blocked store just means no draft — the flow still works in-memory.
		}
	}
}

/** Create a wizard store for a flow. See {@link WizardOptions}. */
export function createWizard<TData = Record<string, unknown>>(
	opts: WizardOptions<TData>
): Wizard<TData> {
	return new Wizard<TData>(opts);
}
