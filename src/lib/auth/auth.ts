// Auth + step-up (O02) — pure. Mock credential check, a fixed deterministic OTP, the
// anti-enumeration copy, and the canonical step-up policy registry the app consumes to
// decide which actions demand re-authentication. No real auth, no real secrets, no PII.

export const SEEDED_EMAIL = 'gokberknur@gmail.com';

/** The fixed mock 2FA / reset code. Real systems send this out-of-band; here it's
 *  printed as a hint on the screen so the demo flow can complete. */
export const MOCK_OTP = '424242';

export type AuthError = 'bad-credentials' | 'bad-otp' | 'rate-limited' | null;

/** A mock credential check — any well-formed email + a 8+ char password is accepted,
 *  so the demo flows without a real backend. A blank/short entry is a no-blame error. */
export function validateCredentials(email: string, password: string): boolean {
	return /.+@.+\..+/.test(email.trim()) && password.length >= 8;
}

export function validOtp(code: string): boolean {
	return code.trim() === MOCK_OTP;
}

/** No-blame, never-leak copy. Login errors don't say which field was wrong; reset
 *  never confirms whether an email exists (anti-enumeration). */
export const AUTH_COPY = {
	badCredentials: 'That email and password didn’t match. Check them and try again.',
	badOtp: 'That code didn’t match — check it and try again.',
	resetSent: 'If that email is registered, I’ve sent a 6-digit code to it.',
	rateLimited: 'Too many attempts. Try again shortly.',
	otpHint: `Demo code: ${MOCK_OTP}`
} as const;

// ---- Step-up policy registry (canonical) --------------------------------
export type StepUpMode = 'always' | 'threshold';

export interface StepUpRule {
	action: string;
	label: string;
	mode: StepUpMode;
	/** For threshold rules, the amount (EUR minor) at/above which step-up is required. */
	thresholdMinor?: number;
}

/** The canonical list of actions that demand re-authentication, consumed app-wide.
 *  `always` = every time; `threshold` = at/above the amount. A recent step-up is
 *  cached briefly (see auth state) so the same risk class isn't re-prompted. */
export const STEP_UP_POLICY: StepUpRule[] = [
	{ action: 'reveal-card', label: 'Reveal a card’s number or PIN', mode: 'always' },
	{ action: 'manage-passkey', label: 'Add or remove a passkey or trusted device', mode: 'always' },
	{ action: 'change-credentials', label: 'Change my password or 2FA', mode: 'always' },
	{ action: 'new-payee-first-payment', label: 'Pay a new payee for the first time', mode: 'always' },
	{ action: 'sign-document', label: 'Sign a document', mode: 'always' },
	{ action: 'tier-downgrade-refund', label: 'Downgrade a plan where a refund applies', mode: 'always' },
	{ action: 'transfer', label: 'Send or exchange money', mode: 'threshold', thresholdMinor: 100000 },
	{ action: 'daily-cumulative', label: 'Exceed my daily payment ceiling', mode: 'threshold', thresholdMinor: 500000 }
];

/** The cache window (ms) a successful step-up suppresses re-prompting for. */
export const STEP_UP_CACHE_MS = 5 * 60 * 1000;

/** Does an action need step-up at this amount? */
export function needsStepUp(action: string, amountMinor = 0): boolean {
	const rule = STEP_UP_POLICY.find((r) => r.action === action);
	if (!rule) return false;
	if (rule.mode === 'always') return true;
	return amountMinor >= (rule.thresholdMinor ?? Infinity);
}
