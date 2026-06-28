import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * P0/P1 — Top up a wallet (P09). The honesty rule: a card top-up is instant
 * (Settled, balance up at once) while a bank/open-banking top-up is pending
 * (Processing, held separate from the settled balance — never faked instant).
 */
test.describe('Top up — instant card vs pending bank', () => {
	test('card top-up settles instantly and adds to the balance', async ({ page }) => {
		await gotoApp(page, '/payments/topup');

		await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('200');
		// Default source is the instant card (Personal Visa).
		await page.getByRole('button', { name: 'Add €200.00' }).first().click();

		await expect(page.getByRole('dialog', { name: 'Add money' })).toBeVisible();
		await expect(page.getByText(/settles instantly/)).toBeVisible();
		// Both the review and the dialog expose "Add €200.00"; the dialog's is last in DOM.
		await page.getByRole('button', { name: 'Add €200.00' }).last().click();

		await expect(page.getByRole('heading', { name: /€200\.00 added to Main/ })).toBeVisible();
		await expect(page.getByText('Settled')).toBeVisible();

		// New balance = seed €6,893.93 + €200.00 = €7,093.93 (to the cent).
		await expect(page.getByText('€7,093.93')).toBeVisible();
		expect(toMinorUnits('€7,093.93')).toBe(toMinorUnits('€6,893.93') + toMinorUnits('€200.00'));
	});

	test('bank top-up is Processing and held separate from the settled balance', async ({ page }) => {
		await gotoApp(page, '/payments/topup');

		await page.getByRole('radio', { name: /SEB current account/ }).click();
		await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('300');
		await page.getByRole('button', { name: 'Add €300.00' }).first().click();

		await expect(page.getByRole('dialog', { name: 'Add money' })).toBeVisible();
		await page.getByRole('button', { name: 'Add €300.00' }).last().click();

		// Honest pending — not a faked instant success.
		await expect(page.getByRole('heading', { name: /€300\.00 on its way to Main/ })).toBeVisible();
		await expect(page.getByText('Processing').first()).toBeVisible();
		await expect(page.getByText(/isn.t in my balance yet/)).toBeVisible();
	});
});
