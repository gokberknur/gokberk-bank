import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Accounts — statements (A06).
 *
 * Locks the on-demand generator: a valid range generates an on-screen statement,
 * and an inverted range (start > end) is blocked reward-early. These are the
 * paths where a silent regression would hand the user a wrong/empty document.
 */

test('statements list renders the periodic statements', async ({ page }) => {
	await gotoApp(page, '/accounts/eur-main/statements');

	await expect(page.getByRole('heading', { level: 1, name: 'Main · Statements' })).toBeVisible();
	await expect(page.getByRole('table', { name: /My statements for Main/ })).toBeVisible();
	await expect(page.getByRole('button', { name: 'View statement' }).first()).toBeVisible();
});

test('generating a valid range renders an on-screen statement doc', async ({ page }) => {
	await gotoApp(page, '/accounts/eur-main/statements');

	await page.getByRole('textbox', { name: 'From' }).fill('2026-05-01');
	await page.getByRole('textbox', { name: 'To' }).fill('2026-05-15');
	await page.getByRole('button', { name: 'Generate statement' }).click();

	// The assembled statement renders holder + period as a real document.
	await expect(
		page.getByRole('heading', { name: 'Statement · 1 May 2026–15 May 2026' })
	).toBeVisible();
	await expect(page.getByText('Gökberk Nur')).toBeVisible();
});

test('an inverted date range is blocked reward-early', async ({ page }) => {
	await gotoApp(page, '/accounts/eur-main/statements');

	await page.getByRole('textbox', { name: 'From' }).fill('2026-05-20');
	await page.getByRole('textbox', { name: 'To' }).fill('2026-05-10');

	await expect(page.getByText('The start date needs to be on or before the end date.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Generate statement' })).toBeDisabled();
});
