import { test, expect, gotoApp } from '../support/fixtures';

/**
 * V04 — the orders blotter. Locks the read surface that closes the trade loop: the
 * seeded orders render with rule+mark+text status (never colour alone), and the
 * status filter narrows to the right bucket (Working groups working+queued; the
 * Filled bucket excludes them). Deep-link reload must serve the SPA, not 404.
 */
test('orders blotter renders seeded orders with mark+text status', async ({ page }) => {
	await gotoApp(page, '/invest/orders');
	await expect(page.getByRole('heading', { level: 1, name: 'My orders' })).toBeVisible();

	// Status is conveyed by a leading mark + the word (◔ ● ✓ ✕ ⊘), never hue alone.
	await expect(page.getByRole('row', { name: /SAP.*✓ Filled/ })).toBeVisible();
	await expect(page.getByRole('row', { name: /ASML.*● Working/ })).toBeVisible();
	await expect(page.getByRole('row', { name: /IWDA.*◔ Queued/ })).toBeVisible();
});

test('status filter narrows the blotter to the selected bucket', async ({ page }) => {
	await gotoApp(page, '/invest/orders');

	await page.getByRole('radio', { name: 'Filled' }).click();
	await expect(page.getByRole('row', { name: /✓ Filled/ }).first()).toBeVisible();
	// Working/queued orders fall away under the Filled filter.
	await expect(page.getByRole('row', { name: /● Working/ })).toHaveCount(0);
	await expect(page.getByRole('row', { name: /◔ Queued/ })).toHaveCount(0);

	// Working bucket groups working + queued (both still live).
	await page.getByRole('radio', { name: 'Working' }).click();
	await expect(page.getByRole('row', { name: /● Working/ }).first()).toBeVisible();
	await expect(page.getByRole('row', { name: /◔ Queued/ }).first()).toBeVisible();
	await expect(page.getByRole('row', { name: /✓ Filled/ })).toHaveCount(0);
});

test('deep-link reload on /invest/orders serves the SPA (no 404)', async ({ page }) => {
	await gotoApp(page, '/invest/orders');
	await page.reload();
	await expect(page.locator('main#main')).toBeVisible();
	await expect(page).toHaveURL(/\/invest\/orders$/);
});
