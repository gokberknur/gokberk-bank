import { test, expect, gotoApp } from '../support/fixtures';

/**
 * PAY-U-03 — the schedule-a-payment wizard collapsed three consecutive single-control steps
 * (frequency / start date / end rule) into one "How & when" step, taking the flow from six steps
 * to four (recipient → schedule → projection → review). This locks that: the wizard reports a
 * 4-step flow, and frequency + start + (for a recurring order) the end rule all live on one step.
 */
test('PAY-U-03: frequency, start and end are one collapsed step (Step 2 of 4)', async ({ page }) => {
	await gotoApp(page, '/payments/scheduled/new');
	await expect(page.getByText('Step 1 of 4')).toBeVisible();

	// Step 1 — recipient & amount (the wallet defaults to the primary EUR wallet).
	await page.getByRole('button', { name: /saved payee/i }).click();
	await page.getByRole('option').first().click();
	await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('250');
	await page.getByRole('button', { name: 'Continue' }).click();

	// Step 2 — the collapsed "How & when": all three controls on a single step. Assert via
	// each control's own slotted/label text (component `label` attrs are shadow-encapsulated).
	await expect(page.getByText('Step 2 of 4')).toBeVisible();
	// Frequency (segmented) + start date (native input) + end rule (radio) all coexist here.
	await expect(page.getByText('Weekly', { exact: true })).toBeVisible();
	await expect(page.getByLabel('When does the first payment go out?')).toBeVisible();
	// The default frequency is recurring (monthly), so the end rule lives on the same step.
	await expect(page.getByRole('radio', { name: 'Until I cancel' })).toBeVisible();
});
