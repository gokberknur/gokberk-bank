<script lang="ts" generics="TData = Record<string, unknown>">
	// The wizard/stepper shell (F05) — an app-local composite that fills a DS gap:
	// the design system has no stepper. It composes gok-* + tokens only and never
	// restyles a DS component. It reads a `createWizard` store (forward-only-when-
	// valid + draft persistence) and renders the brand frame around the flow's
	// active step: a mono eyebrow, a gok-progress indicator, an accessible step
	// rail, the active heading + the flow's slotted content, an optional step-level
	// gok-alert, and the one-primary / one-secondary action row.
	//
	// Rail rationale: we deliberately do NOT use gok-tabs here. Tabs model
	// free, non-linear navigation between peer panels; a wizard is forward-gated
	// (you can't reach an unvisited step) and order-bearing. Mapping it onto the
	// Tabs ARIA pattern would over-promise reachability and fight the gating. So
	// the rail is a purpose-built <nav><ol> of step buttons whose enabled/disabled
	// + aria-current state is derived straight from the wizard store.
	import type { Snippet } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import type { Wizard } from './wizard-store.svelte';

	let {
		wizard,
		children,
		submitLabel = 'Continue',
		onComplete
	}: {
		/** The flow's wizard store (from `createWizard`). */
		wizard: Wizard<TData>;
		/** Renders the active step's content; the flow switches on `wizard.current.id`. */
		children: Snippet;
		/** Primary label on the final step (intermediate steps always read "Continue"). */
		submitLabel?: string;
		/** Runs when the user confirms the final step (review → confirm → success). */
		onComplete?: () => void;
	} = $props();

	// Move focus to the active step's heading whenever the step changes. As an
	// attachment that reads `wizard.currentIndex`, Svelte re-runs it on every step
	// change — but we skip the first run (mount/restore), where stealing focus
	// would be jarring. `primed` is a plain flag, not reactive.
	let primed = false;
	function focusOnStepChange(node: HTMLHeadingElement) {
		void wizard.currentIndex;
		if (primed) node.focus();
		else primed = true;
	}

	/** Is step `i` reachable — behind us, or already visited? */
	function reachable(i: number): boolean {
		return i <= wizard.currentIndex || wizard.visited[i] === true;
	}

	function handlePrimary() {
		if (wizard.isLast) onComplete?.();
		else wizard.goNext();
	}
</script>

<section class="wizard">
	<header class="head">
		<p class="gok-eyebrow eyebrow">Step {wizard.stepNumber} of {wizard.total}</p>
		<gok-progress
			format="fraction"
			label={wizard.current.title}
			{@attach setProps({ value: wizard.stepNumber, max: wizard.total })}
		></gok-progress>
	</header>

	<nav class="rail" aria-label="Progress">
		<ol class="rail-list">
			{#each wizard.steps as step, i (step.id)}
				{@const isCurrent = i === wizard.currentIndex}
				{@const isDone = wizard.visited[i] === true && i < wizard.currentIndex}
				<li class="rail-item">
					<button
						type="button"
						class="step"
						class:is-current={isCurrent}
						class:is-done={isDone}
						aria-current={isCurrent ? 'step' : undefined}
						disabled={!reachable(i)}
						onclick={() => wizard.goTo(i)}
					>
						<span class="marker" aria-hidden="true">
							{#if isDone}
								<svg class="check" viewBox="0 0 16 16" width="16" height="16" fill="none">
									<path
										d="M3.5 8.5l3 3 6-7"
										stroke="currentColor"
										stroke-width="1.75"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							{:else}
								{i + 1}
							{/if}
						</span>
						<span class="step-title">{step.title}</span>
						{#if isDone}<span class="sr-only">(completed)</span>{/if}
					</button>
				</li>
			{/each}
		</ol>
	</nav>

	<div class="panel">
		<h2 class="gok-headline-5 step-heading" tabindex="-1" {@attach focusOnStepChange}>
			{wizard.current.title}
		</h2>

		{#if typeof wizard.error === 'string'}
			<gok-alert status="error" class="step-alert">{wizard.error}</gok-alert>
		{/if}

		{@render children()}
	</div>

	<footer class="actions">
		{#if !wizard.isFirst}
			<gok-button class="back" variant="secondary" {@attach on('click', () => wizard.goBack())}>
				Back
			</gok-button>
		{/if}
		<gok-button variant="primary" {@attach on('click', handlePrimary)}>
			{wizard.isLast ? submitLabel : 'Continue'}
		</gok-button>
	</footer>
</section>

<style>
	.wizard {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	/* --- The step rail (purpose-built, not gok-tabs — see the script comment). --- */
	.rail {
		margin: 0;
	}

	.rail-list {
		display: flex;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.rail-item {
		flex: 1 1 0;
		min-inline-size: 0;
	}

	.step {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		inline-size: 100%;
		margin: 0;
		padding-block: var(--gok-space-200) 0;
		/* The top rule is the rail's per-step status line — hairline by default. */
		border: none;
		border-block-start: var(--gok-border-width-strong) solid var(--gok-color-border);
		background: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		text-align: start;
		cursor: pointer;
		transition: color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	/* Completed steps: ink rule + a check marker (status by rule + icon, not colour). */
	.step.is-done {
		border-block-start-color: var(--gok-color-text);
		color: var(--gok-color-text);
	}

	/* The active step is the one earned accent in the rail. */
	.step.is-current {
		border-block-start-color: var(--gok-color-primary);
		color: var(--gok-color-text);
		font-weight: var(--gok-type-body-large-weight);
		cursor: default;
	}

	.step:disabled {
		color: var(--gok-color-text-disabled);
		cursor: not-allowed;
	}

	.step:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		font-variant-numeric: tabular-nums;
	}

	.step.is-done .marker {
		color: var(--gok-color-primary);
	}

	.check {
		display: block;
	}

	.step-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* --- Active panel --- */
	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.step-heading {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* Don't paint a focus ring on the heading — it's a programmatic focus target. */
	.step-heading:focus {
		outline: none;
	}

	.step-alert {
		display: block;
	}

	/* --- Action row: Back (start) + the single primary (end). --- */
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.back {
		margin-inline-end: auto;
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Mobile: collapse the rail to just the eyebrow + progress + active title. */
	@media (max-width: 40rem) {
		.rail {
			display: none;
		}
	}
</style>
