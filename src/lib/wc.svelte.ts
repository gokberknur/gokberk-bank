import type { Attachment } from 'svelte/attachments';

/**
 * Assign each entry of `props` as a DOM **property** on the host element.
 *
 * Why a property, not an attribute: Svelte (like the DOM) sets *attributes* by
 * default on custom elements, which stringifies the value. Custom elements such
 * as `gok-table` accept rich data (`columns`, `rows`) only as JS properties —
 * objects/arrays can't survive attribute stringification. Assigning the property
 * directly hands the live reference to the element.
 *
 * Because the attachment is created inline in markup, Svelte re-creates (and so
 * re-runs) it whenever the passed `props` change — giving us the reactivity we
 * want without an explicit effect.
 */
export function setProps(props: Record<string, unknown>): Attachment {
	return (node) => {
		for (const [key, value] of Object.entries(props)) {
			(node as unknown as Record<string, unknown>)[key] = value;
		}
	};
}

/**
 * Listen for `type` on the host element, calling `handler`, and clean up on
 * unmount. gök custom elements emit hyphenated composed events (`gok-page-change`,
 * `gok-selection-change`, `gok-sort`, `gok-toggle`) plus plain `change`/`input`.
 * Hyphenated event names have no DOM `on*` property, so addEventListener is the
 * only robust, framework-agnostic way to subscribe.
 */
export function on(type: string, handler: (e: Event) => void): Attachment {
	return (node) => {
		node.addEventListener(type, handler);
		return () => node.removeEventListener(type, handler);
	};
}
