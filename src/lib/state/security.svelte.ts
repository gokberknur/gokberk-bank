// The security spine (O03) — the security center's runtime state: my devices,
// sessions, passkeys, 2FA, and the security event log. Like the rewards and
// insurance spines this is **revision-reactive**: every getter touches
// `revision.value` to take a dependency on the shared signal, and every action
// calls the matching data mutator (which replaces the spine immutably and
// self-appends to the log) then `revision.bump()` so every surface re-flows at
// once.
//
// The data layer (`$lib/data/security-data`) owns the "never lock myself out"
// guard: `removePasskey` / `disableTwoFa` return false (and log a blocked event)
// when the affected credential is my last remaining factor. The actions here
// assume the SURFACE has already run any required step-up — they just mutate,
// bump, and toast. Toast copy is first-person; the DS toast union has no
// `danger`, so the blocked lock-out cases use `error` (its closest sibling).

import {
	getDevices,
	getSessions,
	getPasskeys,
	getTwoFa,
	getSecurityLog,
	factorCount,
	revokeDevice,
	signOutSession,
	signOutEverywhereExceptCurrent,
	addPasskey,
	removePasskey,
	enrollTwoFa,
	disableTwoFa,
	regenerateRecoveryCodes
} from '$lib/data/security-data';
import type {
	Device,
	Session,
	Passkey,
	TwoFa,
	TwoFaMethod,
	SecurityEvent,
	SecurityEventType,
	SecurityResult
} from '$lib/data/security-data';
import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';

export type {
	Device,
	Session,
	Passkey,
	TwoFa,
	TwoFaMethod,
	SecurityEvent,
	SecurityEventType,
	SecurityResult
};

class SecurityState {
	// ── Reads (each takes a dependency on the shared revision signal) ─────────

	/** My known devices, read fresh so a revoke reflects. */
	get devices(): Device[] {
		revision.value;
		return getDevices();
	}

	/** My active sessions, read fresh so a sign-out reflects. */
	get sessions(): Session[] {
		revision.value;
		return getSessions();
	}

	/** My registered passkeys, read fresh so an add / remove reflects. */
	get passkeys(): Passkey[] {
		revision.value;
		return getPasskeys();
	}

	/** My 2FA record (enrolled, method, recovery codes), read fresh. */
	get twoFa(): TwoFa {
		revision.value;
		return getTwoFa();
	}

	/** The security event log — newest-first, kept as the data layer returns it. */
	get log(): SecurityEvent[] {
		revision.value;
		return getSecurityLog();
	}

	/** How many factors can sign me in (passkeys + an enrolled 2FA). */
	get factors(): number {
		revision.value;
		return factorCount();
	}

	/** The sessions that aren't the one I'm on right now. */
	get otherSessions(): Session[] {
		return this.sessions.filter((s) => !s.current);
	}

	/** Whether I'm signed in anywhere other than here. */
	get hasOtherSessions(): boolean {
		return this.otherSessions.length > 0;
	}

	/** True when I'm down to a single factor — the point at which the "remove"
	 *  affordances disable and show the last-factor reason. */
	get isLastFactor(): boolean {
		return this.factors <= 1;
	}

	// ── Actions (step-up already passed; just mutate → bump → toast) ──────────

	/** Revoke a device. (If it were the current device the spec signs me out —
	 *  in the demo I just toast; I don't actually navigate.) */
	revokeDevice(id: string): void {
		revokeDevice(id);
		revision.bump();
		toast('Device revoked', { status: 'success' });
	}

	/** Sign out one session. */
	signOutSession(id: string): void {
		signOutSession(id);
		revision.bump();
		toast('Signed out that session', { status: 'success' });
	}

	/** Sign out every other device, keeping the one I'm on. */
	signOutEverywhere(): void {
		signOutEverywhereExceptCurrent();
		revision.bump();
		toast('Signed out everywhere else', { status: 'success' });
	}

	/** Add a passkey and return it. */
	addPasskey(name: string): Passkey {
		const pk = addPasskey(name);
		revision.bump();
		toast('Passkey added', { status: 'success' });
		return pk;
	}

	/** Remove a passkey. Blocked (returns false) when it's my only way in. */
	removePasskey(id: string): boolean {
		const removed = removePasskey(id);
		revision.bump();
		if (!removed) {
			toast('I can’t remove my only way in', { status: 'error' });
			return false;
		}
		toast('Passkey removed', { status: 'success' });
		return true;
	}

	/** Enrol 2FA with a method and return the fresh recovery codes. */
	enrollTwoFa(method: TwoFaMethod): string[] {
		const codes = enrollTwoFa(method);
		revision.bump();
		toast('2FA is on', { status: 'success' });
		return codes;
	}

	/** Turn off 2FA. Blocked (returns false) when it's my only way in. */
	disableTwoFa(): boolean {
		const disabled = disableTwoFa();
		revision.bump();
		if (!disabled) {
			toast('I can’t turn off my only way in', { status: 'error' });
			return false;
		}
		toast('2FA turned off');
		return true;
	}

	/** Generate a fresh set of recovery codes and return them. */
	regenerateRecoveryCodes(): string[] {
		const codes = regenerateRecoveryCodes();
		revision.bump();
		toast('New recovery codes generated', { status: 'success' });
		return codes;
	}
}

export const security = new SecurityState();
