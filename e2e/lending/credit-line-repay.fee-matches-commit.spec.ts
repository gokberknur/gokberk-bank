import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * P0 money spine — revolving credit-line repayment (L05, manage).
 *
 * Locks "disclosed == committed": the minimum payment shown in the repay drawer and
 * named on the forced-decision confirm must be exactly what comes off the balance and
 * what is freed as available credit, to the cent. Servicing state reseeds on reload,
 * so a fresh context always starts at balance €1,240.00 / available €3,760.00.
 */
test('credit-line repay: disclosed minimum payment equals the committed balance/credit change', async ({
	page
}) => {
	await gotoApp(page, '/lending/credit-line/credit-line-flex');

	const startBalance = await readDef(page, 'Current balance');
	const startAvailable = await readDef(page, 'Available credit');
	const minimum = await readDef(page, 'Minimum payment');
	expect(minimum).toBeGreaterThan(0);

	// Repay drawer — minimum is the default selection.
	await page.getByRole('button', { name: 'Repay', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Repay my credit line' })).toBeVisible();

	// Forced-decision: drawer primary -> nested confirm naming the exact amount.
	// Buttons are slotted into the gok-dialog footer, so select page-level by a
	// regex that includes the amount (dodges the €-glyph and is unique vs the bare
	// summary "Repay"). Capital "Pay" won't match lowercase "repay".
	await page.getByRole('button', { name: /Repay.*62\.00/ }).click();
	await expect(page.getByRole('dialog', { name: 'Confirm my payment' })).toBeVisible();
	await page.getByRole('button', { name: /Pay.*62\.00/ }).click();

	// Committed: balance down by the minimum, available up by the minimum — exactly.
	await expect
		.poll(async () => readDef(page, 'Current balance'))
		.toBe(startBalance - minimum);
	expect(await readDef(page, 'Available credit')).toBe(startAvailable + minimum);
});

/**
 * Read a value by its label, as integer minor units. Works for both the dt/dd
 * description-list rows (Available credit, Minimum payment) and the headline
 * paragraph pair (Current balance) — in each case the value is the next sibling.
 */
async function readDef(page: import('@playwright/test').Page, label: string): Promise<number> {
	const text = await page
		.getByText(label, { exact: true })
		.locator('+ *')
		.first()
		.textContent();
	const minor = toMinorUnits(text ?? '');
	expect(minor, `"${label}" should parse to minor units (got "${text}")`).not.toBeNull();
	return minor as number;
}
