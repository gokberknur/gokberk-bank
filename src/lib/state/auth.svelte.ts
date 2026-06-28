// Auth flow state (O02) — the login → 2FA → signed-in spine, sign-out, and an
// inactivity lock. Mock: it toggles `session.signedIn` and tracks the transient flow
// flags the auth screens bind to. No real credentials are stored.

import { session } from './session.svelte';
import { validateCredentials, validOtp, type AuthError } from '$lib/auth/auth';

class AuthState {
	/** Email that cleared the password step and is awaiting a 2FA code (null = none). */
	pendingEmail = $state<string | null>(null);
	/** Last auth error (no-blame copy lives in AUTH_COPY). */
	error = $state<AuthError>(null);
	/** The shell is locked (inactivity / return); unlock preserves the route. */
	locked = $state(false);

	get signedIn(): boolean {
		return session.signedIn;
	}

	/** Step 1: email + password. On success, hold the email and ask for 2FA. */
	submitCredentials(email: string, password: string): boolean {
		if (!validateCredentials(email, password)) {
			this.error = 'bad-credentials';
			return false;
		}
		this.error = null;
		this.pendingEmail = email.trim();
		return true;
	}

	/** Step 2: the 6-digit code (or a passkey, via `passkey()`). On success, sign in. */
	verifyOtp(code: string): boolean {
		if (!validOtp(code)) {
			this.error = 'bad-otp';
			return false;
		}
		this.completeSignIn();
		return true;
	}

	/** Passkey verification (WebAuthn simulated) — clears 2FA the same as a good code. */
	passkey(): boolean {
		this.completeSignIn();
		return true;
	}

	private completeSignIn() {
		this.error = null;
		this.pendingEmail = null;
		session.signedIn = true;
	}

	signOut() {
		session.signedIn = false;
		this.pendingEmail = null;
		this.error = null;
		this.locked = false;
	}

	lock() {
		this.locked = true;
	}

	/** Unlock with the code (or passkey). Preserves the current route. */
	unlock(code: string): boolean {
		if (!validOtp(code)) {
			this.error = 'bad-otp';
			return false;
		}
		this.error = null;
		this.locked = false;
		return true;
	}

	unlockWithPasskey() {
		this.error = null;
		this.locked = false;
	}

	clearError() {
		this.error = null;
	}
}

export const auth = new AuthState();
