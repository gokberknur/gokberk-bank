// Types for the wizard/stepper composite (F05). A flow declares an ordered list
// of steps; the wizard store (wizard.svelte.ts) drives current/visited/validity
// and the Wizard.svelte shell renders the indicator + the active step + actions.

/** A validation result: `true`/empty = valid; a message (or field map) = invalid. */
export type StepValidation = true | string | Record<string, string>;

export interface StepDef<TData = Record<string, unknown>> {
	/** Stable id; also the URL `[step]` segment. */
	id: string;
	/** Sentence-case step title (shown by the indicator + as the panel heading). */
	title: string;
	/**
	 * Validate the step against the flow data when the user hits Continue. Return
	 * `true` (or omit) to pass; a string/field-map to block with a message. Back
	 * never validates. Reward-early: a flow may also validate live in its fields.
	 */
	validate?: (data: TData) => StepValidation;
	/** Guard entry (e.g. a step only reachable when a prior choice was made). */
	canEnter?: (data: TData) => boolean;
}

export interface WizardOptions<TData = Record<string, unknown>> {
	/** Stable flow id — the localStorage draft key (`gok-bank-wizard-<flowId>`). */
	flowId: string;
	steps: StepDef<TData>[];
	/** The flow's mutable data object (seeded; the wizard persists it as a draft). */
	initialData: TData;
	/** Persist the draft to localStorage (default true). Off for ephemeral flows. */
	persist?: boolean;
}
