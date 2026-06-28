import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Appearance / theme (X04) — the navbar theme switch must flip data-theme on the
 * document and persist the choice (shared `gok-theme` key), so a reload keeps it.
 * A cross-cutting shell guarantee: the whole app re-themes for free off the token
 * roles, so this single switch is the canary for light/dark holding.
 */

test('theme switch flips data-theme and persists across reload', async ({ page }) => {
	await gotoApp(page, '/home');

	// Start state is recorded, then we flip to Dark via the navbar switch.
	await page.getByRole('radio', { name: 'Dark' }).click();
	await expect
		.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
		.toBe('dark');

	await page.reload();
	await expect(page.locator('main#main')).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
		.toBe('dark');

	// Flip back to Light so the persisted state doesn't leak into later runs.
	await page.getByRole('radio', { name: 'Light' }).click();
	await expect
		.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
		.toBe('light');
});
