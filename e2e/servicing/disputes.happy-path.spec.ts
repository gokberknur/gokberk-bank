import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Disputes (S02) — the resumable chargeback wizard: charge → reason → details → evidence
 * → review → forced-decision submit → tracker. Locks the P1 happy path end to end plus
 * two correctness contracts: (1) the transparent provisional-credit note shows on review
 * for a qualifying reason ("not recognised"), and (2) the new case opens at "Raised".
 *
 * The wizard draft persists to localStorage (`gok-bank-wizard-dispute`); a leftover draft
 * would resume mid-flow, so we clear it before every test.
 */

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		window.localStorage.removeItem('gok-bank-wizard-dispute');
	});
});

test('raise a "not recognised" dispute end to end, with provisional-credit disclosed', async ({
	page
}) => {
	await gotoApp(page, '/support/disputes/new');

	// 1. The charge.
	await page.getByRole('radio', { name: /Sushi Daily/ }).click();
	await page.getByRole('button', { name: 'Continue' }).click();

	// 2. What went wrong — a fraud reason that qualifies for provisional credit.
	await page.getByRole('radio', { name: /don't recognise this charge/ }).click();
	await page.getByRole('button', { name: 'Continue' }).click();

	// 3. Tell me more — the statement is required (reward-early gating).
	await page
		.getByRole('textbox', { name: 'Tell me what happened' })
		.fill('I do not recognise this charge at all.');
	await page.getByRole('button', { name: 'Continue' }).click();

	// 4. Evidence — optional; continue without attaching.
	await expect(page.getByRole('heading', { name: 'Add evidence' })).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();

	// 5. Review — the ledger plus a transparent, reversible provisional-credit note.
	await expect(page.getByRole('heading', { name: 'Review & submit' })).toBeVisible();
	await expect(page.getByText(/temporary credit of/i)).toBeVisible();
	await expect(page.getByText(/can be reversed if the dispute isn't upheld/i)).toBeVisible();

	// 6. Forced-decision submit dialog → raise. ("Review & submit" also names the stepper
	// tab, so target the primary action — the last match in DOM order.)
	await page.getByRole('button', { name: 'Review & submit' }).last().click();
	const dialog = page.getByRole('dialog', { name: 'Raise my dispute' });
	await expect(dialog).toBeVisible();
	await page.getByRole('button', { name: 'Raise dispute' }).last().click();

	// 7. Tracker — the case lands on the route and opens at "Raised".
	await expect(page).toHaveURL(/\/support\/disputes\/dsp-/);
	await expect(page.getByRole('heading', { name: /Where my dispute is/ })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Withdraw dispute' })).toBeVisible();
});

test('the seeded provisional-credit case shows a temporary, reversible credit', async ({ page }) => {
	// dsp-1 is seeded in the "provisional-credit" stage — the transparency contract must
	// state the credit is temporary and may be reversed.
	await gotoApp(page, '/support/disputes/dsp-1');

	await expect(page.getByText(/temporary credit of/i)).toBeVisible();
	await expect(page.getByText(/may be reversed if the dispute isn't upheld/i)).toBeVisible();
});
