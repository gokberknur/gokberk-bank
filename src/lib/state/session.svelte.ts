// The signed-in demo user. This is a **mock identity** — a fixed, deterministic
// person so every screen has a name, tier, and home currency to render. There is
// no real auth, KYC, or session here; onboarding / KYC / 2FA / step-up is
// gok-bank-identity's domain (O01–O03), and will own this for real later. The only
// durable field is the plan tier — switching it on /profile/tier persists so the
// tier-driven FX margin (Metal → no markup) survives a reload; everything else
// boots fresh as the same signed-in user.

import { HOME_CURRENCY } from '$lib/data/money';
import type { Currency } from '$lib/data/money';
import { readJSON, writeJSON } from '$lib/state/persist';

export type Tier = 'Standard' | 'Plus' | 'Metal';

const TIER_KEY = 'session-tier';

class SessionState {
	name = $state('Gökberk Nur');
	tier = $state<Tier>(readJSON<Tier>(TIER_KEY, 'Plus'));
	kycLevel = $state<'verified'>('verified');
	homeCurrency = $state<Currency>(HOME_CURRENCY);
	/** Always true in the demo — there is no sign-out flow yet. */
	signedIn = $state(true);

	/** Switch plan tier and persist it (the only mutated session field). */
	setTier(tier: Tier): void {
		this.tier = tier;
		writeJSON(TIER_KEY, tier);
	}

	/** Two-letter initials for the avatar, derived from the name (→ 'GN'). */
	get initials(): string {
		return this.name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('');
	}
}

export const session = new SessionState();
