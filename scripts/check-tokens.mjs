// Token lint — flags any `var(--gok-*)` the app reads that is NOT a real design
// token in @gokberknur/design-system's published manifest (F2, dogfooding 0.4.4).
//
// Why this exists: a mistyped or stale token name (e.g. `--gok-radius-xs`,
// `--gok-font-size-50`, `--gok-border-width-thin`) is silently swallowed by CSS —
// it either falls back to a hardcoded px (defeating theming, a brand violation) or
// resolves to nothing and drops the declaration. The published prod bundle strips
// the dev-time warnings, so nothing surfaces at runtime. This catches the whole
// class at authoring time, wired into `npm run check`.
//
// Scope: READS only — `var(--gok-NAME)`. Setting a component-level override prop
// (e.g. `--gok-icon-size: …;` as a declaration) is not a token read and is not
// flagged. If a component genuinely exposes a `var(--gok-<component>-*)` override
// the app must READ, add its exact name to ALLOWLIST below with a one-line reason.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

// The 226-token manifest shipped on npm (exports key "./tokens-manifest").
const manifestPath = require.resolve('@gokberknur/design-system/tokens-manifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const TOKENS = new Set(manifest.tokens);

// Component-level override props the app legitimately reads via var() but which
// are NOT design tokens (so absent from the manifest). Empty today — the app sets
// component props as declarations, it doesn't read them. Add with a reason if that
// changes, rather than loosening the check.
const ALLOWLIST = new Set([
	// Public component override hooks (documented @cssprop, with fallbacks) that the
	// app shell legitimately READS to keep the top bar's brand block and the rail
	// column the same width — not design tokens, so absent from the manifest.
	'--gok-app-shell-rail-width', // .gok-app-shell rail-column width (defaults to --gok-sidenav-width)
	'--gok-sidenav-rail-width' // gok-sidenav collapsed/icon-rail width (defaults to 3.5rem)
]);

const EXTS = ['.svelte', '.ts', '.css', '.svelte.ts'];
const VAR_RE = /var\(\s*(--gok-[a-z0-9-]+)/g;

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else if (EXTS.some((e) => name.endsWith(e))) out.push(full);
	}
	return out;
}

const violations = [];
for (const file of walk(SRC)) {
	const text = readFileSync(file, 'utf8');
	const lines = text.split('\n');
	lines.forEach((line, i) => {
		for (const m of line.matchAll(VAR_RE)) {
			const token = m[1];
			if (!TOKENS.has(token) && !ALLOWLIST.has(token)) {
				violations.push({ file: relative(ROOT, file), line: i + 1, token });
			}
		}
	});
}

if (violations.length > 0) {
	console.error(
		`\n✖ token-lint: ${violations.length} reference(s) to --gok-* names not in the design-system manifest (${TOKENS.size} tokens):\n`
	);
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line}  ${v.token}`);
	}
	console.error('\nUse a real token (see node_modules/@gokberknur/design-system/dist/tokens/tokens.css), not a typo or a hardcoded fallback.\n');
	process.exit(1);
}

console.log(`✔ token-lint: every var(--gok-*) read resolves to one of ${TOKENS.size} manifest tokens.`);
