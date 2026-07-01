// Security center (O03) — seeded devices, sessions, passkeys, a 2FA record, and a
// security event log, plus immutable mutators the rune store drives. Every
// consequential change appends to the log. Deterministic (TODAY anchor); recovery
// codes are generated from a fixed seed. Mock — no real credentials, no real geo.

import { TODAY, daysBeforeToday, isoDate } from './time';

function hoursBeforeToday(h: number): string {
	const d = new Date(TODAY);
	d.setHours(d.getHours() - h);
	return d.toISOString();
}
function daysAgoIso(n: number): string {
	return daysBeforeToday(n).toISOString();
}

// ─── Devices ──────────────────────────────────────────────────────────────────
export interface Device {
	id: string;
	name: string;
	platform: string;
	/** Mock location — a city, clearly illustrative (no real tracking). */
	location: string;
	lastSeen: string; // ISO
	current: boolean;
}

let devices: Device[] = [
	{ id: 'dev-iphone', name: 'iPhone 16 Pro', platform: 'iOS 19', location: 'Stockholm, SE', lastSeen: hoursBeforeToday(0), current: true },
	{ id: 'dev-macbook', name: 'MacBook Pro', platform: 'macOS 16', location: 'Stockholm, SE', lastSeen: hoursBeforeToday(5), current: false },
	{ id: 'dev-ipad', name: 'iPad Air', platform: 'iPadOS 19', location: 'Stockholm, SE', lastSeen: daysAgoIso(3), current: false },
	{ id: 'dev-chrome-win', name: 'Chrome on Windows', platform: 'Windows 11', location: 'Berlin, DE', lastSeen: daysAgoIso(9), current: false }
];

// ─── Sessions ─────────────────────────────────────────────────────────────────
export interface Session {
	id: string;
	device: string;
	location: string;
	startedAt: string; // ISO
	current: boolean;
}

let sessions: Session[] = [
	{ id: 'ses-1', device: 'iPhone 16 Pro', location: 'Stockholm, SE', startedAt: hoursBeforeToday(1), current: true },
	{ id: 'ses-2', device: 'MacBook Pro', location: 'Stockholm, SE', startedAt: hoursBeforeToday(5), current: false },
	{ id: 'ses-3', device: 'Chrome on Windows', location: 'Berlin, DE', startedAt: daysAgoIso(9), current: false }
];

// ─── Passkeys ─────────────────────────────────────────────────────────────────
export interface Passkey {
	id: string;
	name: string;
	createdAt: string; // ISO
	lastUsed: string; // ISO
}

let passkeys: Passkey[] = [
	{ id: 'pk-iphone', name: 'iPhone — Face ID', createdAt: daysAgoIso(120), lastUsed: hoursBeforeToday(1) },
	{ id: 'pk-macbook', name: 'MacBook — Touch ID', createdAt: daysAgoIso(60), lastUsed: hoursBeforeToday(5) }
];

// ─── 2FA ──────────────────────────────────────────────────────────────────────
export type TwoFaMethod = 'app' | 'sms';
export interface TwoFa {
	enrolled: boolean;
	method: TwoFaMethod | null;
	recoveryCodes: string[];
}

function makeRecoveryCodes(seed: number): string[] {
	// Deterministic 8 codes of the form XXXX-XXXX (base36, no ambiguous chars).
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const codes: string[] = [];
	let h = seed >>> 0;
	for (let i = 0; i < 8; i++) {
		let code = '';
		for (let j = 0; j < 8; j++) {
			h = (Math.imul(h, 1103515245) + 12345) >>> 0;
			if (j === 4) code += '-';
			code += alphabet[h % alphabet.length];
		}
		codes.push(code);
	}
	return codes;
}

let twoFa: TwoFa = { enrolled: true, method: 'app', recoveryCodes: makeRecoveryCodes(0xc0ffee) };

// ─── Security event log ───────────────────────────────────────────────────────
export type SecurityEventType =
	| 'sign-in'
	| 'step-up'
	| 'device-revoked'
	| 'session-signed-out'
	| 'sign-out-all'
	| 'passkey-added'
	| 'passkey-removed'
	| '2fa-changed';

export type SecurityResult = 'ok' | 'blocked' | 'info';

export interface SecurityEvent {
	id: string;
	type: SecurityEventType;
	detail: string;
	device: string;
	location: string;
	at: string; // ISO
	result: SecurityResult;
}

export const EVENT_TYPE_LABELS: Record<SecurityEventType, string> = {
	'sign-in': 'Sign-in',
	'step-up': 'Step-up',
	'device-revoked': 'Device revoked',
	'session-signed-out': 'Session signed out',
	'sign-out-all': 'Signed out everywhere',
	'passkey-added': 'Passkey added',
	'passkey-removed': 'Passkey removed',
	'2fa-changed': '2FA changed'
};

let log: SecurityEvent[] = [
	{ id: 'ev-1', type: 'sign-in', detail: 'Signed in with passkey', device: 'iPhone 16 Pro', location: 'Stockholm, SE', at: hoursBeforeToday(1), result: 'ok' },
	{ id: 'ev-2', type: 'step-up', detail: 'Approved a transfer with passkey', device: 'iPhone 16 Pro', location: 'Stockholm, SE', at: hoursBeforeToday(2), result: 'ok' },
	{ id: 'ev-3', type: 'sign-in', detail: 'Signed in with passkey', device: 'MacBook Pro', location: 'Stockholm, SE', at: hoursBeforeToday(5), result: 'ok' },
	{ id: 'ev-4', type: 'passkey-added', detail: 'Added “MacBook — Touch ID”', device: 'MacBook Pro', location: 'Stockholm, SE', at: daysAgoIso(60), result: 'ok' },
	{ id: 'ev-5', type: 'sign-in', detail: 'Blocked sign-in — wrong code', device: 'Chrome on Windows', location: 'Berlin, DE', at: daysAgoIso(9), result: 'blocked' },
	{ id: 'ev-6', type: '2fa-changed', detail: 'Set up authenticator-app 2FA', device: 'iPhone 16 Pro', location: 'Stockholm, SE', at: daysAgoIso(120), result: 'ok' }
];

let seq = 100;
function nextId(prefix: string): string {
	seq += 1;
	return `${prefix}-${seq}`;
}

/** The device the user is on right now (for stamping new events). */
function currentDevice(): Device {
	return devices.find((d) => d.current) ?? devices[0];
}

export function appendSecurityEvent(
	type: SecurityEventType,
	detail: string,
	result: SecurityResult = 'ok'
): void {
	const d = currentDevice();
	log = [
		{ id: nextId('ev'), type, detail, device: d.name, location: d.location, at: new Date(TODAY).toISOString(), result },
		...log
	];
}

// ─── Reads ────────────────────────────────────────────────────────────────────
export function getDevices(): Device[] {
	return devices;
}
export function getSessions(): Session[] {
	return sessions;
}
export function getPasskeys(): Passkey[] {
	return passkeys;
}
export function getTwoFa(): TwoFa {
	return twoFa;
}
export function getSecurityLog(): SecurityEvent[] {
	return log;
}

/** Factors that can sign me in — passkeys plus an enrolled 2FA. Used to block
 *  removing my last one (never lock myself out). */
export function factorCount(): number {
	return passkeys.length + (twoFa.enrolled ? 1 : 0);
}

// ─── Mutators (immutable replacement so rune reads re-flow) ───────────────────
export function revokeDevice(id: string): void {
	const device = devices.find((d) => d.id === id);
	if (!device) return;
	devices = devices.filter((d) => d.id !== id);
	// Revoking a device also drops any sessions on it.
	sessions = sessions.filter((s) => s.device !== device.name);
	appendSecurityEvent('device-revoked', `Revoked “${device.name}”`);
}

export function signOutSession(id: string): void {
	const s = sessions.find((x) => x.id === id);
	if (!s) return;
	sessions = sessions.filter((x) => x.id !== id);
	appendSecurityEvent('session-signed-out', `Signed out the session on ${s.device}`);
}

export function signOutEverywhereExceptCurrent(): void {
	sessions = sessions.filter((s) => s.current);
	appendSecurityEvent('sign-out-all', 'Signed out every other device');
}

export function addPasskey(name: string): Passkey {
	const pk: Passkey = { id: nextId('pk'), name, createdAt: new Date(TODAY).toISOString(), lastUsed: new Date(TODAY).toISOString() };
	passkeys = [pk, ...passkeys];
	appendSecurityEvent('passkey-added', `Added “${name}”`);
	return pk;
}

/** Returns false (and logs a blocked event) if this is the last factor. */
export function removePasskey(id: string): boolean {
	const pk = passkeys.find((p) => p.id === id);
	if (!pk) return false;
	if (factorCount() <= 1) {
		appendSecurityEvent('passkey-removed', `Blocked removing “${pk.name}” — it’s my only way in`, 'blocked');
		return false;
	}
	passkeys = passkeys.filter((p) => p.id !== id);
	appendSecurityEvent('passkey-removed', `Removed “${pk.name}”`);
	return true;
}

export function enrollTwoFa(method: TwoFaMethod): string[] {
	twoFa = { enrolled: true, method, recoveryCodes: makeRecoveryCodes(method === 'app' ? 0xa11ce : 0x5b5ce) };
	appendSecurityEvent('2fa-changed', `Set up ${method === 'app' ? 'authenticator-app' : 'SMS'} 2FA`);
	return twoFa.recoveryCodes;
}

/** Returns false if 2FA is the last factor (can't disable into lock-out). */
export function disableTwoFa(): boolean {
	if (!twoFa.enrolled) return false;
	if (factorCount() <= 1) {
		appendSecurityEvent('2fa-changed', 'Blocked turning off 2FA — it’s my only way in', 'blocked');
		return false;
	}
	twoFa = { enrolled: false, method: null, recoveryCodes: [] };
	appendSecurityEvent('2fa-changed', 'Turned off 2FA');
	return true;
}

export function regenerateRecoveryCodes(): string[] {
	const fresh = makeRecoveryCodes(seq * 7919 + 13);
	twoFa = { ...twoFa, recoveryCodes: fresh };
	appendSecurityEvent('2fa-changed', 'Regenerated recovery codes');
	return fresh;
}

export { isoDate };
