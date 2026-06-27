<script lang="ts">
	// The in-app document viewer (D01). A read-only gok-drawer that previews one
	// document: a status row (type tag, source, date, size, signed-on line), the
	// summary prose, and the actions. We own the markup here, so — unlike the table
	// cells (strings only, dogfooding #11) — the type can read as a real gok-tag and
	// the signed state as rule + icon + text. The host drawer manages focus, the
	// scrim, and Escape; we feed `open` as a property and close on its gok-close /
	// gok-cancel events. "Download" is simulated — this is a demo, there is no file.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDate } from '$lib/format';
	import { toast } from '$lib/state/toasts.svelte';
	import { DOC_CATEGORY_LABELS, type BankDocument } from '$lib/data/documents-data';

	let {
		doc,
		open,
		onclose
	}: {
		doc: BankDocument | null;
		open: boolean;
		onclose: () => void;
	} = $props();

	const typeLabel = $derived(doc ? DOC_CATEGORY_LABELS[doc.category] : '');
	const issued = $derived(doc ? formatDate(doc.dateIso) : '');

	function download() {
		if (!doc) return;
		// Simulated: no real file. Optimistic two-step toast so the demo reads as a
		// download without ever touching the disk.
		toast('Preparing my document…');
		toast('Saved to my device', { status: 'success' });
	}
</script>

<gok-drawer
	placement="end"
	heading="Document"
	{@attach setProps({ open })}
	{@attach on('gok-close', onclose)}
	{@attach on('gok-cancel', onclose)}
>
	{#if doc}
		<div class="body">
			<h3 class="title gok-headline-5">{doc.title}</h3>

			<div class="status-row">
				<gok-tag size="s">{typeLabel}</gok-tag>
				<span class="meta">{doc.source}</span>
				<span class="meta gok-tabular-nums">{issued}</span>
				<span class="meta gok-tabular-nums">{doc.sizeKb} KB</span>
			</div>

			{#if doc.signed}
				<p class="signed">
					<span class="signed-mark" aria-hidden="true">✓</span>
					<span>Signed on {issued}</span>
				</p>
			{/if}

			<p class="summary">{doc.summary}</p>

			{#if doc.signed}
				<p class="signed-note">This is my signed, timestamped copy.</p>
			{/if}

			<p class="demo-note">Download is simulated in this demo — no file leaves the app.</p>
		</div>
	{/if}

	<div slot="footer" class="footer">
		<gok-button variant="secondary" {@attach on('click', onclose)}>Close</gok-button>
		<gok-button variant="primary" {@attach on('click', download)}>Download</gok-button>
	</div>
</gok-drawer>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.status-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.meta {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.signed {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.signed-mark {
		font-family: var(--gok-font-family-mono);
		color: var(--gok-color-text);
	}

	.summary {
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.signed-note,
	.demo-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}
</style>
