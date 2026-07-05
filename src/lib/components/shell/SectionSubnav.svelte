<script lang="ts">
	// The one shared section sub-nav (unifies the invest / security / settings strips).
	// A single horizontal-scroll strip over a hairline baseline: a row of links whose
	// active item's rule turns to the one earned accent and label to ink (read from
	// aria-current, plus weight — never colour alone). Unbuilt surfaces (`ready: false`)
	// render as inert "Soon" labels (no dead-end links). The whole row is one roving-
	// tabindex tab-stop group so arrow keys sweep the ready items and Tab treats it as a
	// single stop; the active tab is scrolled into view on every navigation. Because the
	// scrollbar is hidden, a thin edge fade cues off-screen items at each inline edge.
	import { page } from '$app/state';
	import type { Attachment } from 'svelte/attachments';
	import { SvelteMap } from 'svelte/reactivity';
	import type { SubNavItem } from '$lib/components/shell/nav-model';

	interface Props {
		/** The sections to list, in display order (from nav-model). */
		items: SubNavItem[];
		/** The accessible name for the <nav> landmark, e.g. "Investing sections". */
		ariaLabel: string;
	}

	let { items, ariaLabel }: Props = $props();

	const pathname = $derived(page.url.pathname);

	// The active item's href by longest-matching-href prefix, so a nested surface still
	// lights its section (e.g. `/invest/plans/x` → "Plans", `/invest/instrument/x` →
	// "Overview"). An `external` item points to another section (e.g. Crypto → `/crypto`),
	// so it only lights on a match within that section — which, inside a single-section
	// layout, means never — mirroring how INVEST_NAV's Crypto behaves. Returns '' when
	// nothing matches (e.g. an overlay route).
	const activeHref = $derived.by(() => {
		let best = '';
		let bestLen = -1;
		for (const item of items) {
			const matches = pathname === item.href || pathname.startsWith(item.href + '/');
			if (matches && item.href.length > bestLen) {
				best = item.href;
				bestLen = item.href.length;
			}
		}
		return best;
	});

	// The ready surfaces' hrefs, in nav order — the roving group arrow keys move through
	// (Soon items are skipped: they're inert spans, not links).
	const readyHrefs = $derived(items.filter((item) => item.ready).map((item) => item.href));

	// Roving tabindex: exactly one ready link is the tab stop. It follows the last-focused
	// ready link; before any focus it defaults to the active link, or the first ready link
	// when the active surface isn't itself a ready link.
	let rovingHref = $state<string | null>(null);
	const tabStopHref = $derived.by(() => {
		if (rovingHref && readyHrefs.includes(rovingHref)) return rovingHref;
		if (readyHrefs.includes(activeHref)) return activeHref;
		return readyHrefs[0] ?? null;
	});

	// Ready-link element refs, keyed by href, collected as each <a> mounts — used to move
	// DOM focus between ready items on arrow/Home/End. Read only imperatively in handlers,
	// self-cleaning on unmount.
	const linkEls = new SvelteMap<string, HTMLAnchorElement>();
	function registerLink(href: string): Attachment<HTMLAnchorElement> {
		return (node) => {
			linkEls.set(href, node);
			return () => {
				linkEls.delete(href);
			};
		};
	}

	// Keyboard: arrows (both axes) + Home/End move focus among the READY items only,
	// wrapping around; Space activates the focused link (a native <a> only fires on
	// Enter, which needs no handling here).
	function onLinkKeydown(event: KeyboardEvent, href: string) {
		if (event.key === ' ' || event.key === 'Spacebar') {
			event.preventDefault();
			(event.currentTarget as HTMLAnchorElement).click();
			return;
		}

		const hrefs = readyHrefs;
		const index = hrefs.indexOf(href);
		if (index === -1) return;

		let target = -1;
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				target = (index + 1) % hrefs.length;
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				target = (index - 1 + hrefs.length) % hrefs.length;
				break;
			case 'Home':
				target = 0;
				break;
			case 'End':
				target = hrefs.length - 1;
				break;
			default:
				return;
		}

		event.preventDefault();
		linkEls.get(hrefs[target])?.focus();
	}

	// The scroll strip (this <nav> is overflow-x: auto). On mount and on every route
	// change, bring the active tab into view. As an attachment that reads `activeHref`,
	// it re-runs on each navigation — after the DOM's aria-current has been updated, so
	// querying the mounted DOM finds the fresh active link. A per-navigation jump is
	// never animated: the default instant 'auto' behaviour is used, reduced-motion
	// honoured explicitly.
	function scrollActiveIntoView(nav: HTMLElement) {
		void activeHref;
		const el = nav.querySelector<HTMLElement>('[aria-current="page"]');
		if (!el) return;

		const options: ScrollIntoViewOptions = { inline: 'nearest', block: 'nearest' };
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			options.behavior = 'auto';
		}
		el.scrollIntoView(options);
	}
</script>

<!-- The scroller wrapper hosts the edge fades (its ::before/::after), pinned to the visual
	 edges so they stay put while the inner <nav> scrolls. -->
<div class="subnav-scroller">
	<nav class="subnav" aria-label={ariaLabel} {@attach scrollActiveIntoView}>
		<ul class="subnav-list">
			{#each items as item (item.href)}
				<li class="subnav-item">
					{#if item.ready}
						<a
							class="subnav-link"
							href={item.href}
							tabindex={item.href === tabStopHref ? 0 : -1}
							aria-current={item.href === activeHref ? 'page' : undefined}
							onfocus={() => (rovingHref = item.href)}
							onkeydown={(event) => onLinkKeydown(event, item.href)}
							{@attach registerLink(item.href)}
						>
							{item.label}
						</a>
					{:else}
						<span class="subnav-link is-soon" aria-disabled="true">
							{item.label}
							<span class="soon">Soon</span>
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
</div>

<style>
	/* Positioning context for the edge fades; the fades sit on top of the scrolling nav
	   but never scroll with it, so they always mark the strip's visual inline edges. */
	.subnav-scroller {
		position: relative;
	}

	/* Edge-fade cue: because the scrollbar is hidden, a partially-scrolled strip gives no
	   hint of off-screen items, so a thin gradient from the page canvas to transparent
	   softens each inline edge to signal "more this way". Decorative (pseudo-elements are
	   out of the a11y tree) and non-interactive; kept thin and painted BEHIND any focused
	   link (which lifts to z-index 1), so it never veils or clips an edge item's focus
	   ring. gokberk-design owns the exact gradient feel. */
	.subnav-scroller::before,
	.subnav-scroller::after {
		content: '';
		position: absolute;
		inset-block: 0;
		inline-size: var(--gok-space-500);
		pointer-events: none;
	}

	.subnav-scroller::before {
		inset-inline-start: 0;
		background: linear-gradient(to right, var(--gok-color-bg), transparent);
	}

	.subnav-scroller::after {
		inset-inline-end: 0;
		background: linear-gradient(to left, var(--gok-color-bg), transparent);
	}

	/* A single horizontally-scrollable strip over a hairline baseline — never wraps into
	   a tall block; the scrollbar is hidden. On a phone this is the thumb-zone tab strip
	   pinned under the page header. */
	.subnav {
		overflow-x: auto;
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		scrollbar-width: none;
	}

	.subnav::-webkit-scrollbar {
		display: none;
	}

	.subnav-list {
		display: flex;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.subnav-item {
		flex: none;
	}

	/* Shared resting look for links and inert "Soon" labels: muted ink, a transparent
	   accent rule that overlaps the baseline, nowrap so the row stays a single strip. */
	.subnav-link {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-300);
		border-block-end: var(--gok-border-width-strong) solid transparent;
		margin-block-end: calc(-1 * var(--gok-border-width-hairline));
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
		text-decoration: none;
		white-space: nowrap;
		transition: color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	a.subnav-link:hover {
		color: var(--gok-color-text);
	}

	/* Active surface: the one earned accent on the rule + label to ink — driven by
	   aria-current, plus weight, so state never rides on colour alone. */
	.subnav-link[aria-current='page'] {
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
		border-block-end-color: var(--gok-color-primary);
	}

	/* Lift a focused link above the edge fades so its ring is always fully drawn. */
	a.subnav-link:focus-visible {
		position: relative;
		z-index: 1;
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	/* Unbuilt surfaces: inert, non-interactive, quietly marked "Soon" — no link, no
	   hover affordance, no focus stop. */
	.is-soon {
		cursor: default;
	}

	.soon {
		display: inline-flex;
		align-items: center;
		padding-inline: var(--gok-space-100);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-pill);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		line-height: var(--gok-type-footnote-line);
		color: var(--gok-color-text-muted);
	}
</style>
