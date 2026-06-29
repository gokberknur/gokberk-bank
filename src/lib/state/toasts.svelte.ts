// App-local toast store (composite F13). The design system's `gok-toast-region`
// is a slotted stack container with no imperative API — you show a toast by
// rendering `gok-toast` children into it. This store holds the live list; the
// app shell (`(app)/+layout.svelte`) renders one `gok-toast` per item and calls
// `dismiss` when an element fires `gok-dismiss`.
//
// `ToastStatus` mirrors the DS `ToastStatus` union (Toast.types.ts:
// 'neutral' | 'info' | 'success' | 'warning' | 'error') so a stored status maps
// straight onto `gok-toast`'s `status` prop.

export type ToastStatus = 'neutral' | 'info' | 'success' | 'warning' | 'error';

/** An optional action affordance — rendered into `gok-toast`'s `action` slot (the
 * one place the accent is spent). `onClick` runs, then the toast dismisses. */
export interface ToastAction {
	label: string;
	onClick: () => void;
}

export interface ToastItem {
	id: number;
	message: string;
	status: ToastStatus;
	duration: number;
	action?: ToastAction;
}

class Toasts {
	items = $state<ToastItem[]>([]);

	// Monotonic id source — never Date.now()/Math.random(), so ids are stable
	// and deterministic across the SPA session (and SSR-safe were it ever on).
	#seq = 0;

	push(
		message: string,
		opts?: { status?: ToastStatus; duration?: number; action?: ToastAction }
	): number {
		const id = ++this.#seq;
		this.items.push({
			id,
			message,
			status: opts?.status ?? 'neutral',
			// With an action, give the user more time to act before auto-dismiss.
			duration: opts?.duration ?? (opts?.action ? 6000 : 4000),
			action: opts?.action
		});
		return id;
	}

	dismiss(id: number): void {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new Toasts();

/** Convenience shorthand — push a toast and get its id back. */
export function toast(
	message: string,
	opts?: { status?: ToastStatus; duration?: number; action?: ToastAction }
): number {
	return toasts.push(message, opts);
}
