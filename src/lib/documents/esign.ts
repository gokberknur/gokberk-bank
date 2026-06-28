// E-sign a document (D02) — pure. The signing session a document moves through
// (review → consent → step-up → signed), a deterministic mock signature reference,
// and which vault documents are signable. No backend: a signature is a stable token
// + an ISO timestamp. The session is persisted (by the state) so a timed-out flow
// resumes where it left off.

import type { BankDocument } from '$lib/data/documents-data';

/** Who's signing — the account holder. */
export const SIGNER = 'Gökberk Nur';

export interface SigningSession {
	docId: string;
	/** Gated: the review step forces a scroll to the end before signing. */
	scrolledToEnd: boolean;
	/** The legal-consent box is ticked. */
	consented: boolean;
	/** Step-up (F12) cleared. */
	stepUpVerified: boolean;
	/** ISO date once signed (null until the final commit). */
	signedAtIso: string | null;
	/** The minted signature reference once signed. */
	signatureRef: string | null;
}

export function emptySession(docId: string): SigningSession {
	return {
		docId,
		scrolledToEnd: false,
		consented: false,
		stepUpVerified: false,
		signedAtIso: null,
		signatureRef: null
	};
}

/** Only unsigned commitment-style documents can be e-signed — a statement or a
 *  certificate isn't a thing you sign. */
export function isSignable(doc: BankDocument): boolean {
	return !doc.signed && (doc.category === 'agreement' || doc.category === 'terms' || doc.category === 'policy');
}

/** A stable pseudo-token (FNV-1a → base36) for a deterministic mock signature ref. */
function hash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** The e-signature reference shown on the signed copy, e.g. GOK-SIG-4F9K2A. */
export function makeSignatureRef(docId: string): string {
	const token = hash(`sign-${docId}`).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
	return `GOK-SIG-${token}`;
}
