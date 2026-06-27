// Saved payees / beneficiaries seed. A realistic European mix: SEPA IBANs,
// a couple of SWIFT (non-EUR) beneficiaries, and gök-user handles. Static seed;
// the payments state adds new ones at runtime (not persisted to this file).

import type { Payee } from './types';

export const PAYEES: readonly Payee[] = [
	{ id: 'payee-lena', name: 'LenaHoffmann', type: 'gok', currency: 'EUR', iban: null, bic: null, handle: '@lena', lastUsedAt: '2026-06-12' },
	{ id: 'payee-marco', name: 'Marco Rossi', type: 'sepa', currency: 'EUR', iban: 'IT60 X054 2811 1010 0000 0123 456', bic: 'BCITITMM', lastUsedAt: '2026-05-28' },
	{ id: 'payee-sofie', name: 'Sofie Jensen', type: 'sepa', currency: 'EUR', iban: 'DK50 0040 0440 1162 43', bic: 'NDEADKKK', lastUsedAt: '2026-06-01' },
	{ id: 'payee-landlord', name: 'Hausverwaltung Berlin', type: 'sepa', currency: 'EUR', iban: 'DE21 1001 0010 0123 4567 89', bic: 'PBNKDEFF', lastUsedAt: '2026-06-18' },
	{ id: 'payee-amelie', name: 'Amélie Laurent', type: 'sepa', currency: 'EUR', iban: 'FR14 2004 1010 0505 0001 3M02 606', bic: 'PSSTFRPP', lastUsedAt: '2026-04-30' },
	{ id: 'payee-james', name: 'James Whitfield', type: 'swift', currency: 'GBP', iban: 'GB29 NWBK 6016 1331 9268 19', bic: 'NWBKGB2L', country: 'GB', lastUsedAt: '2026-03-15' },
	{ id: 'payee-noah', name: 'Noah Andersson', type: 'gok', currency: 'EUR', iban: null, bic: null, handle: '@noah', lastUsedAt: null },
	{ id: 'payee-studio', name: 'Studio Mür AB', type: 'swift', currency: 'SEK', iban: 'SE35 5000 0000 0549 1000 0003', bic: 'ESSESESS', country: 'SE', lastUsedAt: '2026-02-20' },
	{ id: 'payee-clara', name: 'Clara Bianchi', type: 'sepa', currency: 'EUR', iban: 'ES91 2100 0418 4502 0005 1332', bic: 'CAIXESBB', lastUsedAt: null },
	{ id: 'payee-tomas', name: 'Tomáš Novák', type: 'gok', currency: 'EUR', iban: null, bic: null, handle: '@tomas', lastUsedAt: '2026-06-05' }
];
