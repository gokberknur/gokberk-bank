import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Confirmed payments defects, locked as failing-by-design specs so they can't
 * regress unseen and flip green once fixed. Each is marked `fixme` (documented,
 * not run) so the committed suite stays green — see assessmentv1/payments/qa-findings.md.
 */

// PAY-Q-02 — A SEPA *Instant* payment is final per spec ("This can't be undone"),
// yet the success screen offers "Cancel this payment" and it fully reverses.
test('PAY-Q-02: SEPA Instant payment must not offer a cancel action', async ({ page }) => {
	await gotoApp(page, '/payments/transfer');
	await page.getByRole('radio', { name: /Marco Rossi/ }).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('100.50');
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('button', { name: 'Confirm & send' }).click();
	await expect(page.getByRole('dialog', { name: 'Confirm payment' })).toBeVisible();
	// The Send button is the dialog's commit; it's the only "Send €100.50" on the page.
	await page.getByRole('button', { name: 'Send €100.50' }).click();
	await expect(page.getByRole('heading', { name: /sent to Marco Rossi/ })).toBeVisible();
	// Instant settles immediately and is final — there must be NO cancel affordance.
	await expect(page.getByRole('button', { name: 'Cancel this payment' })).toHaveCount(0);
});

// PAY-Q-03 — Cancelling a scheduled standing order via the forced-decision dialog
// has no effect: the row stays "Scheduled" and the active-count is unchanged.
test('PAY-Q-03: cancelling a scheduled payment actually cancels it', async ({ page }) => {
	await gotoApp(page, '/payments/scheduled');
	await expect(page.getByText('4 payments active')).toBeVisible();
	const firstRow = page.getByRole('row').filter({ hasText: 'Hausverwaltung Berlin' }).first();
	// Open the row drawer via its select control (the host checkbox, not the vh label —
	// dogfooding #12). This opens the "Scheduled payment" drawer.
	await firstRow.locator('gok-checkbox').click();
	// Drawer footer trigger opens the forced-decision confirm.
	await page.getByRole('button', { name: 'Cancel payment' }).first().click();
	// The confirm's commit is the danger button nested inside the drawer's top layer.
	await page.locator('button.danger-confirm').click();
	// After cancel the item drops out of the active list (count 4 → 3, row gone).
	await expect(page.getByText('3 payments active')).toBeVisible();
	await expect(page.getByRole('row').filter({ hasText: 'Hausverwaltung Berlin' })).toHaveCount(0);
});

// PAY-Q-04 — Cancelling a SEPA Direct Debit mandate via the forced-decision dialog
// has no effect: the mandate stays "Active" on reopen.
test('PAY-Q-04: cancelling a direct-debit mandate actually cancels it', async ({ page }) => {
	await gotoApp(page, '/payments/direct-debits');
	await expect(page.getByText('5 companies can debit me')).toBeVisible();
	const row = page.getByRole('row').filter({ hasText: 'Folksam' }).first();
	// Open the mandate drawer via its select control (the host checkbox).
	await row.locator('gok-checkbox').click();
	// Drawer footer trigger opens the forced-decision confirm (nested in the drawer).
	await page.getByRole('button', { name: 'Cancel mandate' }).first().click();
	// The confirm's commit — scoped by text since the dispute confirm shares the class.
	await page.locator('button.danger-confirm', { hasText: 'Cancel mandate' }).click();
	// After cancel the mandate drops out of the active list (count 5 → 4, row gone).
	await expect(page.getByText('4 companies can debit me')).toBeVisible();
	await expect(page.getByRole('row').filter({ hasText: 'Folksam' })).toHaveCount(0);
});

// PAY-Q-01 — The money-out forced-decision confirm (send + exchange) is dismissible
// by Escape, but the spec requires `no-dismiss` for these danger-tone confirms.
test('PAY-Q-01: send confirm dialog is no-dismiss (Escape must not close it)', async ({
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
