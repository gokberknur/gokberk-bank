import { test, expect, gotoApp } from '../support/fixtures';

/**
 * PLT-U-01 (S1) — every section must be browsable on a phone, the primary neobank
 * viewport. The bottom bar shows 4 tabs (Home / Accounts / Pay / Invest); the 5th,
 * "More", opens an overflow sheet listing every section, so the other 10 are reachable
 * in ≤2 taps (previously "More" was a dead disabled stub and 9 sections were unbrowsable).
 *
 * Runs on the mobile project (iPhone / Mobile Safari, WebKit) only.
 */

test('mobile: "More" opens a sheet and a previously-hidden section is reachable', async ({ page }) => {
	await gotoApp(page, '/home');

	const more = page.getByRole('button', { name: 'More' });
	await expect(more).toBeVisible();
	await more.click();

	// Scope to the sheet's own nav so we never match the (display:none) desktop rail.
	const sheet = page.getByRole('navigation', { name: 'All sections' });
	const cards = sheet.getByRole('link', { name: 'Cards' });
	await expect(cards).toBeVisible();
	await cards.click();

	await expect(page).toHaveURL(/\/cards$/);
});

test('mobile: every off-tab section is reachable from the More sheet', async ({ page }) => {
	await gotoApp(page, '/home');
	await page.getByRole('button', { name: 'More' }).click();

	const sheet = page.getByRole('navigation', { name: 'All sections' });
	// The sections that are NOT one of the four bottom tabs — all must be listed.
	for (const label of [
		'Cards',
		'Crypto',
		'Lending',
		'Insurance',
		'Budgets',
		'Rewards',
		'Activity',
		'Documents',
		'Support'
	]) {
		await expect(sheet.getByRole('link', { name: label })).toBeVisible();
	}
});
