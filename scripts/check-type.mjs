// Type lint — keeps a type role from being applied half-way.
//
// Why this exists: a type role is a size AND a leading. `--gok-type-body-small-size` without
// `--gok-type-body-small-line` is not "body-small" — it is 14px sitting on whatever line-height
// happened to cascade down, which in this app is the page's 24. That paints 14/24: the right
// size on the wrong grid, 4px taller than the role it claims, and off the 4px baseline the whole
// spine aligns to. It is invisible in isolation and unmistakable once two of them sit side by
// side, which is exactly why it spread to 165 rules across 65 files before anyone measured it.
//
// The design system closed this class inside its own components in 0.6.0 ("line heights are
// explicit throughout — the `line-height: normal` leak that put text boxes off the 4px grid is
// closed"). This is the same rule for app-authored CSS, so the app cannot reintroduce it.
//
// THE RULE — one, deliberately narrow:
//   A rule that declares `font-size: var(--gok-type-*-size)` must also declare a `line-height`.
//
// It does NOT insist the leading be the matching `-line`. A glyph centred with `line-height: 1`
// (an emoji, a badge count, a chevron) is a real and correct thing, and 13 of those exist. What
// is never correct is saying nothing, because then the value comes from context rather than from
// intent. Explicit-and-different is a decision; absent is an accident.
//
// Scope: `<style>` blocks in .svelte plus .css files. Reads only `--gok-type-*-size`; the density
// control-text pair (`--gok-density-control-text-size`) is a component-height concern and is not
// this rule's business.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const EXTS = ['.svelte', '.css'];

// PERMANENT, reasoned exceptions. Empty, and it should stay that way: the rule asks only that a
// leading be stated, which is always possible. An entry here would mean a rule that genuinely
// cannot name its own line-height — add it with a reason, not with "legacy".
const ALLOW = new Map();

const SIZE = /font-size:\s*var\(\s*--gok-type-([\w-]+?)-size\s*\)/g;

/** The innermost `{...}` containing index `i`, as [openBraceIndex, closeBraceIndex]. */
function ownBlock(css, i) {
	let depth = 0;
	let j = i;
	while (j > 0) {
		j -= 1;
		if (css[j] === '}') depth += 1;
		else if (css[j] === '{') {
			if (depth === 0) break;
			depth -= 1;
		}
	}
	if (css[j] !== '{') return null;
	let k = i;
	depth = 0;
	while (k < css.length) {
		if (css[k] === '{') depth += 1;
		else if (css[k] === '}') {
			if (depth === 0) break;
			depth -= 1;
		}
		k += 1;
	}
	return [j, k];
}

/** This block's own declarations, with any nested blocks removed. */
function ownDeclarations(block) {
	let depth = 0;
	let out = '';
	for (const ch of block) {
		if (ch === '{') depth += 1;
		else if (ch === '}') depth -= 1;
		else if (depth === 0) out += ch;
	}
	return out;
}

/** The selector immediately preceding a block's opening brace, for the error message. */
function selectorFor(css, openIndex) {
	const before = css.slice(0, openIndex);
	const cut = Math.max(before.lastIndexOf('}'), before.lastIndexOf('{'), before.lastIndexOf(';'));
	return before
		.slice(cut + 1)
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.trim()
		.replace(/\s+/g, ' ')
		.slice(0, 60);
}

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
	const text = readFileSync(file, 'utf8');

	// A .svelte file's CSS is its <style> block; a .css file is all CSS.
	const regions = [];
	if (rel.endsWith('.svelte')) {
		for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
			regions.push({ css: m[1], offset: m.index + m[0].indexOf(m[1]) });
		}
	} else {
		regions.push({ css: text, offset: 0 });
	}

	for (const { css, offset } of regions) {
		for (const m of css.matchAll(SIZE)) {
			const block = ownBlock(css, m.index);
			if (!block) continue;
			const [open, close] = block;
			if (/line-height\s*:/.test(ownDeclarations(css.slice(open + 1, close)))) continue;
			const key = `TYPE ${rel}`;
			if (ALLOW.has(key)) continue;
			found.push({
				file: rel,
				line: text.slice(0, offset + m.index).split('\n').length,
				role: m[1],
				selector: selectorFor(css, open)
			});
		}
	}
}

if (found.length > 0) {
	console.error(`\n✖ type-lint: ${found.length} half-applied type role(s):\n`);
	for (const v of found) {
		console.error(`  ${v.file}:${v.line}  ${v.selector}`);
		console.error(
			`      → sets --gok-type-${v.role}-size with no line-height, so the leading is inherited.` +
				`\n        Add line-height: var(--gok-type-${v.role}-line); or state the leading you do want.`
		);
	}
	console.error('');
	process.exit(1);
}

console.log(
	`✔ type-lint: every --gok-type-*-size states its own leading${ALLOW.size ? ` (${ALLOW.size} reasoned exception(s))` : ''}.`
);
