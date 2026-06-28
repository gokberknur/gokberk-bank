// Preferences store (X04) — language, display currency, and the per-event ×
// per-channel notification matrix. Durable user choices, persisted under the
// `gok-bank-` prefix via persist.ts (theme and density are deliberately NOT here —
// they keep their DS-shared keys and live in their own stores). Security-critical
// notifications are mandatory: their cells stay on and cannot be turned off, so a
// fraud or sign-in alert can always reach the user.

import { readJSON, writeJSON } from '$lib/state/persist';
import type { Currency } from '$lib/data/money';

export type Language = 'en' | 'sv' | 'de' | 'tr';

export const LANGUAGES: { id: Language; label: string }[] = [
	{ id: 'en', label: 'English' },
	{ id: 'sv', label: 'Svenska' },
	{ id: 'de', label: 'Deutsch' },
	{ id: 'tr', label: 'Türkçe' }
];

export const DISPLAY_CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'SEK'];

/** Notification taxonomy (mirrors the F13 categories). `mandatory` rows can't be muted. */
export const NOTIF_EVENTS = [
	{ id: 'money', label: 'Money', note: 'Incoming and outgoing payments, low balance.' },
	{ id: 'cards', label: 'Cards', note: 'Card spend, declines, freezes.' },
	{
		id: 'security',
		label: 'Security',
		note: 'Sign-ins, fraud alerts, step-up — always on.',
		mandatory: true
	},
	{ id: 'applications', label: 'Applications', note: 'Loan, card and claim status.' },
	{ id: 'market', label: 'Market', note: 'Price alerts, order fills, dividends.' },
	{ id: 'system', label: 'System', note: 'Statements, product news, maintenance.' }
] as const;

export type NotifEventId = (typeof NOTIF_EVENTS)[number]['id'];

export const NOTIF_CHANNELS = [
	{ id: 'push', label: 'Push' },
	{ id: 'email', label: 'Email' },
	{ id: 'inapp', label: 'In-app' }
] as const;

export type NotifChannelId = (typeof NOTIF_CHANNELS)[number]['id'];

export type NotifMatrix = Record<NotifEventId, Record<NotifChannelId, boolean>>;

const MANDATORY = new Set<NotifEventId>(
	NOTIF_EVENTS.filter((e) => 'mandatory' in e && e.mandatory).map((e) => e.id)
);

export function isMandatory(event: NotifEventId): boolean {
	return MANDATORY.has(event);
}

function defaultMatrix(): NotifMatrix {
	const m = {} as NotifMatrix;
	for (const e of NOTIF_EVENTS) {
		// Sensible defaults: everything on for in-app; push on except low-signal System;
		// email on for the things people want a paper trail of. Security is fully on.
		m[e.id] = {
			push: e.id !== 'system',
			email: e.id === 'money' || e.id === 'security' || e.id === 'applications',
			inapp: true
		};
	}
	// Mandatory rows are forced fully on regardless of stored state.
	for (const id of MANDATORY) m[id] = { push: true, email: true, inapp: true };
	return m;
}

const LANG_KEY = 'pref-language';
const CURRENCY_KEY = 'pref-display-currency';
const NOTIF_KEY = 'pref-notifications';

class PrefsState {
	language = $state<Language>(readJSON<Language>(LANG_KEY, 'en'));
	displayCurrency = $state<Currency>(readJSON<Currency>(CURRENCY_KEY, 'EUR'));
	notifications = $state<NotifMatrix>(this.#loadMatrix());

	#loadMatrix(): NotifMatrix {
		const stored = readJSON<NotifMatrix | null>(NOTIF_KEY, null);
		const base = defaultMatrix();
		if (!stored) return base;
		// Merge stored over defaults so a newly-added event/channel still appears,
		// then re-force the mandatory rows on.
		for (const e of NOTIF_EVENTS) {
			if (stored[e.id]) base[e.id] = { ...base[e.id], ...stored[e.id] };
		}
		for (const id of MANDATORY) base[id] = { push: true, email: true, inapp: true };
		return base;
	}

	setLanguage(lang: Language): void {
		this.language = lang;
		writeJSON(LANG_KEY, lang);
	}

	setDisplayCurrency(currency: Currency): void {
		this.displayCurrency = currency;
		writeJSON(CURRENCY_KEY, currency);
	}

	/** Toggle one cell. Mandatory events are a no-op (their switch is disabled in the UI too). */
	toggleNotif(event: NotifEventId, channel: NotifChannelId): void {
		if (isMandatory(event)) return;
		const next: NotifMatrix = {
			...this.notifications,
			[event]: { ...this.notifications[event], [channel]: !this.notifications[event][channel] }
		};
		this.notifications = next;
		writeJSON(NOTIF_KEY, next);
	}

	isOn(event: NotifEventId, channel: NotifChannelId): boolean {
		return this.notifications[event][channel];
	}
}

export const prefs = new PrefsState();
