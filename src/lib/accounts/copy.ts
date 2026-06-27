// Clipboard helper for copyable identifiers (IBAN/BIC). Browser-only; returns
// whether the copy succeeded so the caller can show a transient "Copied" state.
// Kept framework-free — the UI owns the feedback affordance.

import { browser } from '$app/environment';

export async function copyText(text: string): Promise<boolean> {
	if (!browser) return false;
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Clipboard API blocked (permissions / insecure context) — fall back to a
		// hidden textarea + execCommand so copy still works on the demo.
		try {
			const ta = document.createElement('textarea');
			ta.value = text;
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			const ok = document.execCommand('copy');
			document.body.removeChild(ta);
			return ok;
		} catch {
			return false;
		}
	}
}
