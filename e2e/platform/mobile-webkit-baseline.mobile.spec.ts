import { test, expect, gotoApp } from '../support/fixtures';

/**
 * PLT mobile / WebKit baseline — the iOS-Safari correctness pass (Phase A).
 *
 * Runs ONLY on the `mobile` project (iPhone 13, WebKit — the engine the app ships to), so it's a
 * real Safari regression guard, not a Chromium emulation. It asserts the systemic fixes hold:
 *   - the viewport opts into `viewport-fit=cover` (so every env(safe-area-inset-*) resolves on a notch),
 *   - the theme-color meta is a concrete #rrggbb hex (older iOS Safari ignores the oklch() token),
 *   - no page pushes a horizontal scrollbar at phone width (the global overflow discipline holds).
 */

// Representative routes across the sections: a dashboard, a data-grid browse surface, a flow hub,
// a ledger, and the card wallet — the shapes most likely to overflow on a phone.
const ROUTES = ['/home', '/accounts', '/payments', '/cards', '/invest/discover'];

test('viewport opts into viewport-fit=cover', async ({ page }) => {
	await gotoApp(page, '/home');
	await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
});

test('theme-color is a concrete hex (Safari-parseable, not oklch)', async ({ page }) => {
	await gotoApp(page, '/home');
	// Set on mount from the resolved --gok-color-bg token, normalised to #rrggbb.
	await expect
		.poll(async () => page.locator('meta[name="theme-color"]').getAttribute('content'))
		.toMatch(/^#[0-9a-f]{6}$/i);
});

for (const route of ROUTES) {
	test(`no horizontal overflow at phone width: ${route}`, async ({ page }) => {
		await gotoApp(page, route);
		const overflow = await page.evaluate(() => {
			const doc = document.documentElement;
			return doc.scrollWidth - doc.clientWidth;
		});
		// Allow a 1px sub-pixel rounding slack; anything more is a real horizontal scrollbar.
		expect(overflow).toBeLessThanOrEqual(1);
	});
}
