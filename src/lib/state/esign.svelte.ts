// E-sign state (D02) — owns the signing session a document moves through and the
// final commit. Sessions are persisted (localStorage) so a flow interrupted by a
// timeout or a reload resumes at the step reached with scroll/consent restored. The
// final sign() stamps the vault document signed (D01) and reflects via `revision`.

import { revision } from './revision.svelte';
import { toast } from './toasts.svelte';
import { readJSON, writeJSON } from './persist';
import { getDocument, markDocumentSigned } from '$lib/data/documents-data';
import type { BankDocument } from '$lib/data/documents-data';
import { TODAY, isoDate } from '$lib/data/time';
import { emptySession, makeSignatureRef, SIGNER } from '$lib/documents/esign';
import type { SigningSession } from '$lib/documents/esign';

const KEY = 'esign-sessions';

class EsignState {
	private sessions = $state<Record<string, SigningSession>>(readJSON(KEY, {}));

	private save() {
		writeJSON(KEY, this.sessions);
	}

	/** The signing session for a document, created on first touch. */
	session(docId: string): SigningSession {
		if (!this.sessions[docId]) {
			this.sessions = { ...this.sessions, [docId]: emptySession(docId) };
			this.save();
		}
		return this.sessions[docId];
	}

	private patch(docId: string, change: Partial<SigningSession>) {
		const next = { ...this.session(docId), ...change };
		this.sessions = { ...this.sessions, [docId]: next };
		this.save();
	}

	markScrolled(docId: string) {
		this.patch(docId, { scrolledToEnd: true });
	}

	setConsent(docId: string, consented: boolean) {
		this.patch(docId, { consented });
	}

	setStepUp(docId: string, verified: boolean) {
		this.patch(docId, { stepUpVerified: verified });
	}

	/** True once every gate is cleared and the document may be signed. */
	canSign(docId: string): boolean {
		const s = this.session(docId);
		return s.scrolledToEnd && s.consented && s.stepUpVerified;
	}

	/** Is this document already signed (in the vault)? */
	isSigned(docId: string): boolean {
		revision.value;
		return !!getDocument(docId)?.signed;
	}

	/** The signed document (with signedAtIso + signatureRef) for the signed panel. */
	signedDocument(docId: string): BankDocument | undefined {
		revision.value;
		return getDocument(docId);
	}

	get signer(): string {
		return SIGNER;
	}

	/** Commit the signature — stamps the vault doc signed with a timestamp + ref.
	 *  Returns the signature reference, or null if a gate is unmet. */
	sign(docId: string): string | null {
		if (!this.canSign(docId)) return null;
		const ref = makeSignatureRef(docId);
		const signedAtIso = isoDate(TODAY);
		markDocumentSigned(docId, signedAtIso, ref);
		this.patch(docId, { signedAtIso, signatureRef: ref });
		revision.bump();
		toast('Document signed', { status: 'success' });
		return ref;
	}

	/** Discard a session (e.g. after leaving an unfinished flow). */
	reset(docId: string) {
		this.sessions = { ...this.sessions, [docId]: emptySession(docId) };
		this.save();
	}
}

export const esign = new EsignState();
