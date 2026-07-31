// Layout lint — keeps the X06 grid spine from eroding one file at a time.
//
// Why this exists: before X06 the app had 31 distinct `grid-template-columns` values and 31
// distinct `max-inline-size` values, because every surface solved its own columns and its own
// width. Individually invisible; in aggregate it is exactly why screens did not line up. The
// spine only stays a spine if new drift is caught at authoring time, so this runs in
// `npm run check` beside check-tokens.mjs.
//
// Two rules:
//   1. COLUMNS  — a route may not declare `grid-template-columns`. Compose with the shared
//                 spine (`.page-grid` + `subgrid` + cell roles in src/lib/styles/layout.css).
//                 Components may still declare tracks for their own internals.
//   2. MEASURE  — `max-inline-size` must read a measure role (--measure-read / -form / -rail,
//                 --gok-container-*, --field-*), be a `ch` value (text sizing to its content),
//                 or be 100%/none. A bare rem width is drift.
//
// Deliberately NOT linted: "small space is content, not layout" (CV-LAY-9). A regex cannot tell
// a card gutter from an icon↔label gap, and 72 of the route-level `gap: var(--gok-space-100/200)`
// uses are correct content spacing. Linting it would push authors to widen content gaps, which is
// the opposite of the intent. It stays a written convention, enforced in review.
//
// KNOWN carries the violations that existed when the spine landed. It is a ratchet: a file
// leaves the list when it is migrated and may never be added back. Anything not in KNOWN is a
// hard failure. Run with `--prune` to rewrite KNOWN after a migration wave.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const KNOWN_PATH = join(dirname(fileURLToPath(import.meta.url)), 'layout-known.json');

// PERMANENT, reasoned exceptions — distinct from KNOWN, which is a shrinking migration backlog.
// KNOWN must reach zero; ALLOW never does, because these are correct as they stand. Every entry
// needs a reason, and "not migrated yet" is not one — that is what KNOWN is for.
const ALLOW = new Map([
	[
		'COLUMNS src/routes/(app)/crypto/[symbol]/+page.svelte',
		'`.stats` is an in-panel key/value <dl>, not a page-level card run. Its panel does not span the whole spine, so page tracks would be the wrong tracks.'
	],
	[
		'COLUMNS src/routes/(app)/invest/instrument/[symbol]/+page.svelte',
		'Same in-panel `.stats` ledger as the crypto instrument page.'
	],
	[
		'COLUMNS src/routes/(app)/lending/loans/[id]/+page.svelte',
		'`.facts` is an in-panel key/value strip between hairlines, not a card run — its panel does not span the spine.'
	],
	[
		'COLUMNS src/routes/(app)/lending/mortgages/[id]/+page.svelte',
		'Same in-panel `.facts` strip; the page\'s real card run (rate-switch) IS on the spine.'
	],
	[
		'COLUMNS src/routes/(app)/lending/credit-line/[id]/+page.svelte',
		'Same in-panel `.facts` strip as the loan and mortgage detail pages.'
	],
	// Content truncation caps, not layout measures: these size a piece of TEXT so it ellipsises,
	// which is the `--field-*` family's job, not a page/panel measure role.
	[
		'MEASURE src/lib/components/invest/WatchTable.svelte',
		'`.sym-name` caps an instrument name so it truncates in its cell.'
	],
	[
		'MEASURE src/lib/components/invest/InstrumentGrid.svelte',
		'Same `.sym-name` truncation cap as WatchTable.'
	],
	[
		'MEASURE src/routes/(app)/invest/+page.svelte',
		'Same `.sym-name` truncation cap in the holdings grid.'
	],
	[
		'MEASURE src/routes/(app)/payments/request/+page.svelte',
		'`.qr-note` caps a caption under a QR code to the code\'s own width.'
	],
	[
		'MEASURE src/routes/(app)/payments/request/[step]/+page.svelte',
		'Same `.qr-note` caption cap as the request hub.'
	],
	// ── Component internals: a component owns its own structure; the spine owns where the
	// component sits. Putting a toolbar row or a table row on page tracks would be wrong.
	[
		'COLUMNS src/routes/(app)/+layout.svelte',
		'`.shell` IS the app-shell grid (topbar/rail/main), not page content.'
	],
	[
		'COLUMNS src/routes/(app)/budgets/+page.svelte',
		'`.sub-card` is a `1fr auto` label/value row inside a card.'
	],
	[
		'COLUMNS src/routes/(app)/cards/[id]/+page.svelte',
		'`.spend-body` pairs a fixed 18rem chart column with a fluid list — an intrinsic first track, not a spine span.'
	],
	[
		'COLUMNS src/routes/(app)/crypto/+page.svelte',
		'`.bal` is a five-column table row.'
	],
	[
		'COLUMNS src/routes/(app)/payments/scheduled/new/+page.svelte',
		'`.run` is a `1fr auto auto` row of controls.'
	],
	[
		'COLUMNS src/routes/(app)/security/+layout.svelte',
		'`.posture-stats` is an in-layout stat strip above the security sub-routes, not page content.'
	],
	[
		'COLUMNS src/routes/(app)/accounts/pots/[id]/+page.svelte',
		'`.figures` is a two-up intrinsic figure pair (`minmax(8rem, auto)`) inside a card.'
	],
	[
		'COLUMNS src/routes/(app)/accounts/[id]/statements/+page.svelte',
		'`.doc-meta` is a two-column metadata list inside a statement row.'
	],
	[
		'COLUMNS src/routes/(app)/security/2fa/+page.svelte',
		'`.code-grid` lays out recovery codes — a content matrix, like the QR grid.'
	],
	// ── The card-art track, already documented in CardStrip itself.
	[
		'MEASURE src/lib/components/cards/CardStrip.svelte',
		'Card art is fixed-aspect media at a real physical size; its 16rem track and width are intrinsic.'
	],
	[
		'MEASURE src/lib/components/cards/CardArt.svelte',
		'Same fixed-aspect card art.'
	]
]);
const EXTS = ['.svelte', '.css'];

// The spine itself, and the app-global sheet that defines the measure roles, are the source of
// truth — they are allowed to say the things everything else may not.
const EXEMPT = new Set(['src/lib/styles/layout.css', 'src/app.css']);

const RULES = [
	{
		id: 'COLUMNS',
		// Routes only. A component owns its internal structure; a route composes the spine.
		applies: (f) => f.startsWith('src/routes/'),
		re: /grid-template-columns\s*:\s*([^;]+);/g,
		ok: (v) => /\bsubgrid\b/.test(v),
		hint: 'use .page-grid + a cell role (see src/lib/styles/layout.css), or subgrid'
	},
	{
		id: 'MEASURE',
		applies: () => true,
		re: /max-inline-size\s*:\s*([^;]+);/g,
		ok: (v) =>
			/var\(\s*--(measure-|field-|gok-container-)/.test(v) ||
			/\d\s*ch\b/.test(v) ||
			/^\s*(100%|none|fit-content.*|max-content|min-content)\s*$/.test(v),
		hint: 'read a measure role: --measure-read / --measure-form / --measure-rail / --gok-container-*'
	}
];

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else if (EXTS.some((e) => name.endsWith(e))) out.push(full);
	}
	return out;
}

const found = [];
for (const file of walk(SRC)) {
	const rel = relative(ROOT, file).split('\\').join('/');
	if (EXEMPT.has(rel)) continue;
	const lines = readFileSync(file, 'utf8').split('\n');
	for (const rule of RULES) {
		if (!rule.applies(rel)) continue;
		lines.forEach((line, i) => {
			for (const m of line.matchAll(rule.re)) {
				const value = m[1].trim().replace(/\s+/g, ' ');
				if (rule.ok(value)) continue;
				const key = `${rule.id} ${rel}`;
				if (ALLOW.has(key)) continue;
				found.push({ key, rule: rule.id, file: rel, line: i + 1, value, hint: rule.hint });
			}
		});
	}
}

let known = [];
try {
	known = JSON.parse(readFileSync(KNOWN_PATH, 'utf8'));
} catch {
	known = [];
}
const knownSet = new Set(known);

if (process.argv.includes('--prune')) {
	const keys = [...new Set(found.map((f) => f.key))].sort();
	writeFileSync(KNOWN_PATH, JSON.stringify(keys, null, '\t') + '\n');
	console.log(`✔ layout-lint: KNOWN rewritten — ${keys.length} entr(y|ies) remaining.`);
	process.exit(0);
}

const fresh = found.filter((f) => !knownSet.has(f.key));
const stale = known.filter((k) => !found.some((f) => f.key === k));

if (fresh.length > 0) {
	console.error(`\n✖ layout-lint: ${fresh.length} new layout drift violation(s):\n`);
	for (const v of fresh) {
		console.error(`  ${v.file}:${v.line}  [${v.rule}]  ${v.value}`);
		console.error(`      → ${v.hint}`);
	}
	console.error('');
	process.exit(1);
}

// The ratchet: once a file is migrated its entry must go, so KNOWN can only ever shrink.
if (stale.length > 0) {
	console.error(`\n✖ layout-lint: ${stale.length} KNOWN entr(y|ies) no longer violate anything:\n`);
	for (const k of stale) console.error(`  ${k}`);
	console.error('\nMigration done — run `node scripts/check-layout.mjs --prune` to drop them.\n');
	process.exit(1);
}

console.log(
	`✔ layout-lint: no new drift (${known.length} awaiting migration, ${ALLOW.size} permanently allowed).`
);
