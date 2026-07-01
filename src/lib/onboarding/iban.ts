// Deterministic IBAN/BIC issuance for the onboarding completion (O01). Mock —
// no real bank, no real account — but the IBAN is a *valid* Swedish IBAN with
// correct ISO 13616 mod-97 check digits, so it reads as the real thing. The
// clearing/account digits derive from a seed (the applicant's name), so the same
// applicant always gets the same IBAN. No Math.random / Date.now.

const CLEARING = '800'; // notional 3-digit Swedish clearing number
const COUNTRY = 'SE';
const BIC = 'GOKBSESS'; // bank · country · location (Stockholm) — static for the demo

/** A small stable string hash → unsigned 32-bit (FNV-1a). */
function hash(seed: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** N deterministic decimal digits from a seed + salt. */
function digits(seed: string, salt: number, n: number): string {
	let out = '';
	let h = hash(seed + ':' + salt);
	while (out.length < n) {
		out += (h % 10).toString();
		h = Math.floor(h / 10) || hash(out + seed);
	}
	return out.slice(0, n);
}

/** ISO 7064 mod-97-10 over the rearranged IBAN string (letters → 10..35). */
function mod97(input: string): number {
	let remainder = 0;
	const expanded = input
		.split('')
		.map((ch) => (/[A-Z]/.test(ch) ? (ch.charCodeAt(0) - 55).toString() : ch))
		.join('');
	// Process in chunks to stay within safe integer range.
	for (let i = 0; i < expanded.length; i += 7) {
		remainder = Number(String(remainder) + expanded.slice(i, i + 7)) % 97;
	}
	return remainder;
}

export interface IssuedAccount {
	iban: string;
	/** IBAN grouped in 4s for display. */
	ibanPretty: string;
	bic: string;
}

/** Issue a deterministic, mod-97-valid SE IBAN for an applicant name. */
export function issueIban(seedName: string): IssuedAccount {
	const seed = seedName.trim().toLowerCase() || 'new applicant';
	const accountNo = digits(seed, 2, 17); // 17-digit account
	const bban = `${CLEARING}${accountNo}`; // 20 numeric digits
	// Check digits: append "<COUNTRY>00" then compute 98 - mod97.
	const check = 98 - mod97(`${bban}${COUNTRY}00`);
	const cc = check.toString().padStart(2, '0');
	const iban = `${COUNTRY}${cc}${bban}`;
	const ibanPretty = iban.replace(/(.{4})/g, '$1 ').trim();
	return { iban, ibanPretty, bic: BIC };
}
