import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Confirmed payments defects, locked as failing-by-design specs so they can't
 * regress unseen and flip green once fixed. Each is marked `fixme` (documented,
 * not run) so the committed suite stays green — see assessmentv1/payments/qa-findings.md.
 */

// PAY-Q-02 — A SEPA *Instant* payment is final per spec ("This can't be undone"),
// yet the success screen offers "Cancel this payment" and it fully reverses.
test.fixme('PAY-Q-02: SEPA Instant payment must not offer a cancel action', async ({ page }) => {
	await gotoApp(page, '/payments/transfer');
	await page.getByRole('radio', { name: /Marco Rossi/ }).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('100.50');
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('button', { name: 'Confirm & send' }).click();
	await page
		.getByRole('dialog', { name: 'Confirm payment' })
		.getByRole('button', { name: 'Send €100.50' })
		.click();
	await expect(page.getByRole('heading', { name: /sent to Marco Rossi/ })).toBeVisible();
	// Instant settles immediately and is final — there must be NO cancel affordance.
	await expect(page.getByRole('button', { name: 'Cancel this payment' })).toHaveCount(0);
});

// PAY-Q-03 — Cancelling a scheduled standing order via the forced-decision dialog
// has no effect: the row stays "Scheduled" and the active-count is unchanged.
test.fixme('PAY-Q-03: cancelling a scheduled payment actually cancels it', async ({ page }) => {
	await gotoApp(page, '/payments/scheduled');
	const firstRow = page.getByRole('row').filter({ hasText: 'Hausverwaltung Berlin' }).first();
	await firstRow.getByText('Select row').click();
	await page.getByRole('button', { name: 'Cancel payment' }).click();
	await page
		.getByRole('dialog', { name: /Cancel this payment/ })
		.getByRole('button', { name: 'Cancel payment' })
		.click();
	// After cancel the mandate should read Cancelled, not Scheduled.
	await expect(firstRow.getByText('Cancelled')).toBeVisible();
});

// PAY-Q-04 — Cancelling a SEPA Direct Debit mandate via the forced-decision dialog
// has no effect: the mandate stays "Active" on reopen.
test.fixme('PAY-Q-04: cancelling a direct-debit mandate actually cancels it', async ({ page }) => {
	await gotoApp(page, '/payments/direct-debits');
	const row = page.getByRole('row').filter({ hasText: 'Folksam' }).first();
	await row.getByText('Select row').click();
	await page.getByRole('button', { name: 'Cancel mandate' }).click();
	await page
		.getByRole('dialog', { name: /Cancel the Folksam mandate/ })
		.getByRole('button', { name: 'Cancel mandate' })
		.click();
	await expect(row.getByText('Cancelled')).toBeVisible();
});

// PAY-Q-01 — The money-out forced-decision confirm (send + exchange) is dismissible
// by Escape, but the spec requires `no-dismiss` for these danger-tone confirms.
test.fixme('PAY-Q-01: send confirm dialog is no-dismiss (Escape must not close it)', async ({
	page
}) => {
	await gotoApp(page, '/payments/transfer');
	await page.getByRole('radio', { name: /Marco Rossi/ }).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('100.50');
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('button', { name: 'Confirm & send' }).click();
	const dialog = page.getByRole('dialog', { name: 'Confirm payment' });
	await expect(dialog).toBeVisible();
	await page.keyboard.press('Escape');
	// A no-dismiss forced-decision confirm must remain open after Escape.
	await expect(dialog).toBeVisible();
});
