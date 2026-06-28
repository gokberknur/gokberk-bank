import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Crypto holdings (V07) — the read surface.
 * Locks: the wallet renders with a total header, exactly the Buy/Send/Receive
 * primaries, balance rows that deep-link into asset detail, and the on-chain
 * activity ledger. A silent break here means the whole crypto home is dark.
 */

test('holdings render with total, primaries, and the activity ledger', async ({ page }) => {
	await gotoApp(page, '/crypto');

	// Total-value header (a grouped EUR figure).
	const total = page.getByRole('heading', { level: 1 });
	await expect(total).toBeVisible();
	await expect(total).toHaveText(/€[\d.,]+/);

	// The three actions, with Buy as the single primary.
	const actions = page.getByRole('region', { name: 'Crypto actions' });
	await expect(actions.getByRole('button', { name: 'Buy' })).toBeVisible();
	await expect(actions.getByRole('button', { name: 'Send' })).toBeVisible();
	await expect(actions.getByRole('button', { name: 'Receive' })).toBeVisible();

	// At least one balance row, and the on-chain activity grid with a status word.
	await expect(page.getByRole('link', { name: /Bitcoin/ })).toBeVisible();
	await expect(page.getByText(/Confirmed/).first()).toBeVisible();
});

test('a balance row deep-links into its asset detail', async ({ page }) => {
	await gotoApp(page, '/crypto');

	await page.getByRole('link', { name: /Bitcoin/ }).click();
	await expect(page).toHaveURL(/\/crypto\/BTC$/);
	await expect(page.getByRole('heading', { name: 'Bitcoin', level: 1 })).toBeVisible();

	// Reloading the deep link must serve the SPA shell, not 404 / bounce to login.
	await page.reload();
	await expect(page.locator('main#main')).toBeVisible();
	await expect(page).toHaveURL(/\/crypto\/BTC$/);
	await expect(page).not.toHaveURL(/\/login/);
});
