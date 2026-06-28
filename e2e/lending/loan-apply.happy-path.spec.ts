import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * P0 money spine — personal loan application (L01).
 *
 * Locks the gather -> soft-check -> offer -> e-sign -> done journey and the
 * regulated-disclosure data integrity: the offer's "total cost of credit" must
 * equal "total amount repayable" minus the loan amount, to the cent, and the
 * e-sign forced-decision must gate the funds (consent + step-up) before "signed".
 *
 * Selectors are role/text only (web-component actions expose no href). The draft
 * persists under localStorage; a fresh Playwright context starts clean at step 1.
 */
test('loan apply: offer discloses reconciling cost of credit, e-sign gates, done states the 14-day right', async ({
	page
}) => {
	await gotoApp(page, '/lending/loans/apply');

	// Step 1 — amount & term (seeded defaults). Advance.
	await expect(page.getByRole('heading', { name: 'Amount & term' })).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();

	// Step 2 — purpose (a default is pre-selected). Advance.
	await expect(page.getByRole('heading', { name: 'Purpose' })).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();

	// Step 3 — finances. A healthy income approves.
	await page.getByRole('textbox', { name: 'Gross annual income (EUR)' }).fill('60000');
	await page.getByRole('textbox', { name: 'Monthly housing cost (EUR)' }).fill('1200');
	await page.getByRole('textbox', { name: 'Existing monthly credit commitments (EUR)' }).fill('200');
	await page.getByRole('button', { name: 'Run check' }).click();

	// Offer ledger.
	await expect(page.getByRole('heading', { name: 'I can offer this' })).toBeVisible();

	const amount = await readLedger(page, 'Amount');
	const repayable = await readLedger(page, 'Total amount repayable');
	const cost = await readLedger(page, 'Total cost of credit');

	// Data integrity: cost of credit == total repayable - principal, to the cent.
	expect(repayable - amount).toBe(cost);
	expect(cost).toBeGreaterThan(0);

	// E-sign forced-decision. The dialog content (consent, step-up, footer) is slotted
	// into the gok-dialog, so select page-level — each control is unique on the page.
	await page.getByRole('button', { name: 'Continue to sign' }).click();
	await expect(page.getByRole('dialog', { name: 'Sign my credit agreement' })).toBeVisible();
	const sign = page.getByRole('button', { name: 'Sign agreement' });
	await expect(sign).toBeDisabled(); // gated until consent + step-up

	// Step-up alone is not enough.
	await page.getByRole('button', { name: 'Approve with passkey' }).click();
	await expect(page.getByText('Verified with passkey')).toBeVisible();
	await expect(sign).toBeDisabled();

	// Consent enables it. (Regex avoids straight-vs-curly apostrophe mismatch.)
	await page.getByText(/read and agree to the credit agreement/i).click();
	await expect(sign).toBeEnabled();
	await sign.click();

	// Done — signed, honest funds ETA, and the 14-day withdrawal right stated.
	await expect(page.getByRole('heading', { name: 'My loan is signed' })).toBeVisible();
	await expect(page.getByText('Approved')).toBeVisible();
	await expect(page.getByText(/14-day right to withdraw/i)).toBeVisible();
});

/** Read a value from the offer description-list by its term label, as minor units. */
async function readLedger(page: import('@playwright/test').Page, term: string): Promise<number> {
	const value = await page
		.getByText(term, { exact: true })
		.locator('+ *')
		.first()
		.textContent();
	const minor = toMinorUnits(value ?? '');
	expect(minor, `ledger "${term}" should parse to minor units (got "${value}")`).not.toBeNull();
	return minor as number;
}
