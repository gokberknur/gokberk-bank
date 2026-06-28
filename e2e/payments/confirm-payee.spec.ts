import { test, expect, gotoApp } from '../support/fixtures';

/**
 * PAY-Q-05 — confirmation of payee (name-match) in the add-payee wizard. The SEPA flow now
 * inserts a "Confirm" step that simulates asking the receiving bank for the registered account
 * holder's name (the front line against APP fraud). A clean match confirms and proceeds; a
 * mismatch shows the registered name and BLOCKS the wizard until the sender explicitly
 * acknowledges they've checked. Deterministic IBANs (confirm-payee.ts hash): DE89… matches,
 * NL91 ABNA 0417 1643 00 returns a different holder ("J. Schneider").
 */

async function startSepaPayee(page, name: string, iban: string) {
	await gotoApp(page, '/payments/payees/new');
	await page.getByText('SEPA IBAN', { exact: true }).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('textbox', { name: 'Name' }).fill(name);
	await page.getByRole('textbox', { name: 'IBAN' }).fill(iban);
	await page.getByRole('button', { name: 'Continue' }).click();
}

test('CoP: a matching account name confirms and the wizard proceeds', async ({ page }) => {
	await startSepaPayee(page, 'Greta Vogel', 'DE89 3704 0044 0532 0130 00');

	// Confirm step: clean match.
	await expect(page.getByText('The account name matches')).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();

	// Review step, then save.
	await expect(page.getByText('Check the details, then save this payee.')).toBeVisible();
	await page.getByRole('button', { name: 'Add payee' }).click();

	await expect(page).toHaveURL(/\/payments\/payees$/);
	await expect(page.getByText('Greta Vogel')).toBeVisible();
});

test('CoP: a name mismatch blocks the wizard until acknowledged', async ({ page }) => {
	await startSepaPayee(page, 'Greta Vogel', 'NL91 ABNA 0417 1643 00');

	// Confirm step: the bank returns a different holder.
	await expect(page.getByText('The name doesn’t match')).toBeVisible();
	await expect(page.getByText('J. Schneider')).toBeVisible();

	// Continue is gated — without the acknowledgement the wizard refuses to advance.
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByText(/checked the account name before continuing/i)).toBeVisible();
	await expect(page.getByText('Check the details, then save this payee.')).toHaveCount(0);

	// Acknowledge, then it proceeds. The DS checkbox's real <input> is visually hidden in
	// shadow DOM, so force-click it directly (a plain .check() waits on visibility).
	await page.getByRole('checkbox', { name: /checked this is correct/i }).click({ force: true });
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByText('Check the details, then save this payee.')).toBeVisible();
});
