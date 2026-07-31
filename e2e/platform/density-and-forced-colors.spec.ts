import { test, expect, gotoApp } from '../support/fixtures';

/**
 * The last two `verification.md` conditions, which had been deferred through the whole X06
 * layout migration: compact density and forced colors.
 *
 * Neither is layout-specific, which is why they get their own spec rather than being bolted
 * onto the grid-alignment guard. Both are conditions a screen must hold up in, per the design
 * system's rubric — axis 4 (density) and the forced-colors requirement that structure comes
 * from borders and outlines, never from a shadow.
 */

const SAMPLE = [
	'/home',
	'/accounts',
	'/payments/topup',
	'/payments/transfer',
	'/invest',
	'/cards/order',
	'/insurance/quote',
	'/lending/loans/apply'
] as const;

const CONTROLS = 'gok-button, gok-input, gok-select, gok-money';

/** Every visible control's height, in DOM order. */
async function controlHeights(page: import('@playwright/test').Page, sel: string) {
	return page.evaluate(
		(s) =>
			[...document.querySelectorAll(s)]
				.map((e) => Math.round(e.getBoundingClientRect().height))
				.filter((h) => h > 0),
		sel
	);
}

test.describe('compact density', () => {
	test('shrinks every control without dropping any, and keeps rows aligned', async ({ page }) => {
		// Comparing a control against ITSELF across the two densities is the assertion that
		// matters. Comparing different components on one row does not: `gok-money` reserves a
		// validation message line (patterns.md §3), so it is legitimately taller than a
		// `gok-select` beside it, in both densities.
		for (const route of SAMPLE) {
			await gotoApp(page, route);
			const comfortable = await controlHeights(page, CONTROLS);

			await page.evaluate(() => localStorage.setItem('gok-density', 'compact'));
			await gotoApp(page, route);
			await expect
				.poll(() => page.evaluate(() => document.documentElement.dataset.density))
				.toBe('compact');
			const compact = await controlHeights(page, CONTROLS);

			expect(compact.length, `${route}: control count changed under compact`).toBe(
				comfortable.length
			);
			const before = comfortable.reduce((a, x) => a + x, 0);
			const after = compact.reduce((a, x) => a + x, 0);
			expect(after, `${route}: compact did not shrink controls (${before} → ${after})`).toBeLessThan(
				before
			);

			await page.evaluate(() => localStorage.setItem('gok-density', 'comfortable'));
		}
	});

	test('no route overflows horizontally under compact', async ({ page }) => {
		await gotoApp(page, '/home');
		await page.evaluate(() => localStorage.setItem('gok-density', 'compact'));
		for (const route of SAMPLE) {
			await gotoApp(page, route);
			const overflows = await page.evaluate(
				() => document.documentElement.scrollWidth > window.innerWidth
			);
			expect(overflows, `${route} overflows under compact density`).toBe(false);
		}
		await page.evaluate(() => localStorage.setItem('gok-density', 'comfortable'));
	});
});

test.describe('forced colors', () => {
	test.use({ forcedColors: 'active' });

	test('structure survives — nothing is separated only by a shadow', async ({ page }) => {
		// Forced colors strips box-shadow and background-image. The brand already forbids
		// shadow-as-border (verification.md axis 2), so this is the condition that proves it:
		// an element carrying a shadow but no border and no outline would lose its edge here.
		for (const route of SAMPLE) {
			await gotoApp(page, route);
			const shadowOnly = await page.evaluate(() =>
				[...document.querySelectorAll('.page-grid *')]
					.filter((e) => {
						const cs = getComputedStyle(e);
						const shadow = cs.boxShadow && cs.boxShadow !== 'none';
						const border =
							parseFloat(cs.borderTopWidth) > 0 ||
							parseFloat(cs.borderBottomWidth) > 0 ||
							parseFloat(cs.borderLeftWidth) > 0 ||
							parseFloat(cs.borderRightWidth) > 0;
						const outline = parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none';
						return shadow && !border && !outline;
					})
					.map((e) => (e.className || e.tagName).toString().slice(0, 40))
			);
			expect(shadowOnly, `${route}: element(s) separated only by box-shadow`).toEqual([]);
		}
	});

	test('text stays legible and no route overflows', async ({ page }) => {
		for (const route of SAMPLE) {
			await gotoApp(page, route);
			const d = await page.evaluate(() => ({
				invisible: [...document.querySelectorAll('.page-grid :is(p, h1, h2, h3, span)')].filter(
					(e) => getComputedStyle(e).color === 'rgba(0, 0, 0, 0)' && (e.textContent || '').trim()
				).length,
				overflows: document.documentElement.scrollWidth > window.innerWidth
			}));
			expect(d.invisible, `${route}: transparent text under forced colors`).toBe(0);
			expect(d.overflows, `${route} overflows under forced colors`).toBe(false);
		}
	});
});
