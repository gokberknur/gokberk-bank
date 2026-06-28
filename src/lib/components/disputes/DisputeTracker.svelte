<script lang="ts">
	// S02 · Dispute resolution tracker — the stage indicator for one card dispute. It
	// reads the four DISPUTE_STAGES (Raised → Investigating → Provisional credit →
	// Resolved) as a horizontal stepper, with a fraction progress ("3 of 4") and a
	// status tag above it. Status is carried by **rule + icon + text**, never colour
	// alone: each node shows a check (done), a filled accent dot (current) or a hollow
	// ring (upcoming), each with an `.sr-only` word, and the tag pairs a small inline
	// glyph with the status word. A withdrawn dispute isn't "in flight", so it drops the
	// stepper for a single calm "Withdrawn" line. An upheld/declined dispute has reached
	// the Resolved node, so that node reads done, not current. The summary region is an
	// `aria-live="polite"` so a status change is announced.
	//
	// Interop is strictly `setProps` from `wc.svelte` — `value`/`max` are DOM properties
	// on `gok-progress`, never `bind:` and never stringified attributes. The status tag
	// has no icon slot (dogfooding #23), so the glyph + word are inlined in its default slot.
	import { disputes, DISPUTE_STAGES, DISPUTE_STATUS_LABELS } from '$lib/disputes/disputes.svelte';
	import type { DisputeStatus } from '$lib/disputes/disputes.svelte';
	import { setProps } from '$lib/wc.svelte';

	interface Props {
		/** The dispute's current status — drives the stage, the markers and the tag. */
		status: DisputeStatus;
	}

	let { status }: Props = $props();

	// How many of the four stages this status has reached (0 for withdrawn).
	const stage = $derived(disputes.stage(status));
	const isWithdrawn = $derived(status === 'withdrawn');
	// Upheld / declined have reached the Resolved node — it reads done, not current.
	const isTerminal = $derived(status === 'upheld' || status === 'declined');

	type Marker = 'done' | 'current' | 'upcoming';

	// A node at 1-based `position` is done once the stage has passed it; the stage's own
	// node is current while in flight, or done once the dispute is resolved.
	function markerFor(position: number): Marker {
		if (position < stage) return 'done';
		if (position === stage) return isTerminal ? 'done' : 'current';
		return 'upcoming';
	}

	// A plain word for each marker so the state isn't conveyed by the glyph alone.
	const MARKER_WORD: Record<Marker, string> = {
		done: 'done',
		current: 'in progress',
		upcoming: 'not started'
	};
</script>

{#snippet statusGlyph()}
	{#if status === 'upheld'}
		<!-- upheld · check (calm-positive: the charge was put right) -->
		<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
			<path
				d="M5 12.5l4.5 4.5L19 7"
				stroke="currentColor"
				stroke-width="1.9"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else if status === 'declined'}
		<!-- declined · a calm circled dash (a decision reached, no blame) -->
		<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
			<path d="M8.5 12h7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
		</svg>
	{:else if status === 'withdrawn'}
		<!-- withdrawn · a quiet minus -->
		<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
			<path d="M6 12h12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
		</svg>
	{:else if status === 'provisional-credit'}
		<!-- provisional credit · a circular arrow (temporary, reversible) -->
		<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
			<path
				d="M19 12a7 7 0 1 1-2.05-4.95"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
			/>
			<path
				d="M19 4v3.5h-3.5"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else if status === 'investigating'}
		<!-- investigating · clock -->
		<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
			<path
				d="M12 8v4l2.5 2"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else}
		<!-- raised · filled dot -->
		<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
			<circle cx="12" cy="12" r="5" />
		</svg>
	{/if}
{/snippet}

<div class="tracker">
	<!-- Summary — announced on change. The tag carries the status word + glyph; the
	     fraction reads "n of 4" while the dispute is in flight. -->
	<div class="summary" aria-live="polite">
		<gok-tag size="m">
			<span class="status">
				{@render statusGlyph()}
				{DISPUTE_STATUS_LABELS[status]}
			</span>
		</gok-tag>

		{#if !isWithdrawn}
			<gok-progress
				class="progress"
				format="fraction"
				label="Dispute progress"
				{@attach setProps({ value: stage, max: 4 })}
			></gok-progress>
		{/if}
	</div>

	{#if isWithdrawn}
		<!-- Withdrawn — not in flight, so no stepper. One muted line. -->
		<p class="withdrawn">This dispute was withdrawn. It's closed, and nothing further happens here.</p>
	{:else}
		<ol class="stepper" aria-label="Dispute stages">
			{#each DISPUTE_STAGES as label, i (label)}
				{@const position = i + 1}
				{@const marker = markerFor(position)}
				<li class="step" data-marker={marker}>
					<span class="node" aria-hidden="true">
						{#if marker === 'done'}
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none">
								<path
									d="M5 12.5l4.5 4.5L19 7"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						{:else if marker === 'current'}
							<span class="dot"></span>
						{:else}
							<span class="ring"></span>
						{/if}
					</span>
					<span class="step-label">{label}</span>
					<span class="sr-only">— {MARKER_WORD[marker]}</span>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.tracker {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	/* ── Summary ── */
	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
	}

	.progress {
		flex: 1 1 12rem;
		min-inline-size: 12rem;
	}

	/* ── Withdrawn ── */
	.withdrawn {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Stepper — four nodes joined by a hairline rule ── */
	.stepper {
		display: flex;
		align-items: flex-start;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.step {
		position: relative;
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-200);
		text-align: center;
	}

	/* The connector: a hairline from the previous node to this one, centred on the
	   node row. It stops short of the nodes on each side. */
	.step:not(:first-child)::before {
		content: '';
		position: absolute;
		inset-block-start: calc(1.5rem / 2);
		inset-inline-start: calc(-50% + 1.5rem / 2 + var(--gok-space-100));
		inline-size: calc(100% - 1.5rem - 2 * var(--gok-space-100));
		block-size: var(--gok-border-width-hairline);
		background: var(--gok-color-border);
		transform: translateY(-50%);
	}

	/* A passed connector (the node before this one is done) reads in the accent. */
	.step[data-marker='current']::before,
	.step[data-marker='done']::before {
		background: var(--gok-color-primary);
	}

	.node {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-surface);
	}

	/* Done — a check in the accent on a filled-weight ring. */
	.step[data-marker='done'] .node {
		border: var(--gok-border-width-hairline) solid var(--gok-color-primary);
		color: var(--gok-color-primary);
	}

	/* Current — a filled accent dot inside the ring. */
	.step[data-marker='current'] .node {
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.dot {
		inline-size: 0.5rem;
		block-size: 0.5rem;
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-primary);
	}

	/* Upcoming — a hollow neutral ring. */
	.step[data-marker='upcoming'] .node {
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.ring {
		inline-size: 0.5rem;
		block-size: 0.5rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong, var(--gok-color-border));
	}

	.step-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* The reached stages name themselves in ink; upcoming stays muted. */
	.step[data-marker='done'] .step-label,
	.step[data-marker='current'] .step-label {
		color: var(--gok-color-text);
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
</style>
