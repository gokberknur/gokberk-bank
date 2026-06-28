// Confirmation of Payee (CoP) — a deterministic name-match simulation (P10 / regulatory-and-trust).
//
// Real CoP asks the receiving bank for the registered account-holder name and compares it to the
// name the sender typed. It is the front line against APP (authorised push payment) fraud and against
// a simple typo'd IBAN — friction here is protection, not annoyance. There is no real bank here, so
// we simulate it deterministically from the IBAN: most accounts confirm the typed name (a clean
// match), and a stable minority return a DIFFERENT registered name, exercising the mismatch /
// proceed-anyway path. Mock only — no PII, no network.

export type CopStatus = 'match' | 'no-match';

export interface CopResult {
	status: CopStatus;
	/** The account holder's name as the (simulated) receiving bank holds it. */
	accountName: string;
}

/** Registered names the sim hands back on a mismatch — plausible, initialled, not real people. */
const REGISTERED_NAMES = ['J. Schneider', 'M. Rossi Holdings', 'A. Dubois', 'P. Novak', 'L. Andersson'];

const normalize = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** A small, stable hash over the normalized IBAN (deterministic across reloads). */
function ibanHash(iban: string): number {
	const key = iban.replace(/\s+/g, '').toUpperCase();
	let h = 0;
	for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0;
	return h;
}

/**
 * Simulate a confirmation-of-payee check. Deterministic in (typedName, iban): a stable subset of
 * IBANs (~1 in 6) come back with a different registered name; everything else confirms the typed
 * name. An empty IBAN or name can't be checked → treated as a match (the step is SEPA-only and runs
 * after IBAN validation, so this is just a guard).
 */
export function confirmPayee(typedName: string, iban: string): CopResult {
	const name = typedName.trim();
	const key = iban.replace(/\s+/g, '');
	if (!name || !key) return { status: 'match', accountName: name };

	const h = ibanHash(key);
	if (h % 6 === 0) {
		const registered = REGISTERED_NAMES[h % REGISTERED_NAMES.length];
		// If the typed name happens to equal the registered name, it's a match after all.
		if (normalize(registered) === normalize(name)) return { status: 'match', accountName: name };
		return { status: 'no-match', accountName: registered };
	}
	return { status: 'match', accountName: name };
}
