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
				found.push({ key: `${rule.id} ${rel}`, rule: rule.id, file: rel, line: i + 1, value, hint: rule.hint });
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
	`✔ layout-lint: no new drift (${known.length} known violation(s) awaiting migration).`
);
