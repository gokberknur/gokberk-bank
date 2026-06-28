import { test, expect, gotoApp } from '../support/fixtures';

/**
 * P0 money spine — SEPA send to a saved payee (P02).
 * Drives the full wizard (recipient -> amount -> review -> forced confirm -> success)
 * and asserts the review ledger amount equals the success amount, and the forced
 * confirm dialog appears before any money moves.
 */
test.describe('Send money — SEPA happy path', () => {
	test('pay a saved SEPA payee €100.50 end to end', async ({ page }) => {
		await gotoApp(page, '/payments/transfer');

		// Step 1 — recipient.
		await page.getByRole('radio', { name: /Marco Rossi/ }).click();
		await page.getByRole('button', { name: 'Continue' }).click();

		// Step 2 — amount + reference.
		await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('100.50');
		await page.getByRole('textbox', { name: 'Reference (optional)' }).fill('Dinner Tuesday');
		await page.getByRole('button', { name: 'Continue' }).click();

		// Step 3 — review ledger discloses the amount.
		await expect(page.getByRole('heading', { name: 'Review and send' })).toBeVisible();
		await expect(page.getByText('€100.50').first()).toBeVisible();

		// Forced-decision confirm appears BEFORE money moves.
		await page.getByRole('button', { name: 'Confirm & send' }).click();
		await expect(page.getByRole('dialog', { name: 'Confirm payment' })).toBeVisible();
		// gok-dialog slots its actions in light DOM; select the confirm at page level.
		await page.getByRole('button', { name: 'Send €100.50' }).click();

		// Success — committed amount matches the disclosed amount.
		await expect(page.getByRole('heading', { name: /€100\.50 sent to Marco Rossi/ })).toBeVisible();
	});
});
