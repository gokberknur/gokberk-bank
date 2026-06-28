<script lang="ts">
	// P07 · A real, monochrome SVG QR code for a payment-request link. Unlike the
	// crypto Receive glyph (an illustrative matrix), this paints an actual scannable
	// QR from `qrcode-generator`: a paper rect under one 1×1 ink rect per dark module,
	// with a two-module quiet zone baked into the viewBox. It is pure monochrome and
	// token-only — ink is `--gok-color-text`, paper is `--gok-color-surface`, set via
	// the CSS `fill` property (presentation attributes can't read `var()`). The QR is
	// NEVER the only way to pay: the link text is always shown alongside it. A11y:
	// `role="img"` + a naming label; the modules themselves are decorative.
	import qrcode from 'qrcode-generator';

	interface Props {
		/** The payload the code encodes (the shareable link — also shown as text). */
		value: string;
		/** Rendered box size (any CSS length); defaults to a comfortable 12rem. */
		size?: string;
		/** Accessible name; defaults to "QR code for {value}". */
		label?: string;
	}

	let { value, size = '12rem', label }: Props = $props();

	/** The quiet-zone margin, in modules, on every side (QR spec recommends ≥ 4; 2 reads clean here). */
	const MARGIN = 2;

	// One model per payload — recomputed only when `value` changes. Auto type number
	// (0) sizes the symbol to the data; ECL 'M' balances density against robustness.
	const model = $derived.by(() => {
		const qr = qrcode(0, 'M');
		qr.addData(value);
		qr.make();
		const count = qr.getModuleCount();
		const dim = count + MARGIN * 2;
		const cells: { x: number; y: number }[] = [];
		for (let r = 0; r < count; r++) {
			for (let c = 0; c < count; c++) {
				if (qr.isDark(r, c)) cells.push({ x: c + MARGIN, y: r + MARGIN });
			}
		}
		return { dim, cells };
	});

	const ariaLabel = $derived(label ?? `QR code for ${value}`);
</script>

<svg
	class="qr"
	role="img"
	aria-label={ariaLabel}
	viewBox="0 0 {model.dim} {model.dim}"
	shape-rendering="crispEdges"
	style="--qr-size: {size}"
>
	<!-- Paper: the full field (covers the quiet zone too). -->
	<rect class="paper" x="0" y="0" width={model.dim} height={model.dim} />
	<!-- Ink: one unit square per dark module. -->
	{#each model.cells as cell (cell.x + '-' + cell.y)}
		<rect class="ink" x={cell.x} y={cell.y} width="1" height="1" />
	{/each}
</svg>

<style>
	.qr {
		display: block;
		inline-size: var(--qr-size);
		block-size: var(--qr-size);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	/* Monochrome via the CSS `fill` property — never a hardcoded #000/#fff. */
	.paper {
		fill: var(--gok-color-surface);
	}

	.ink {
		fill: var(--gok-color-text);
	}
</style>
