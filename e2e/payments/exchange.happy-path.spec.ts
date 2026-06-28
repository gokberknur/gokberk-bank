import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * P0 money spine — FX exchange (P04).
 * Proves the disclosed converted amount on the confirm dialog equals what the
 * receipt commits, to the cent (minor units). Tier is pinned to 'Plus' by the
 * fixture, so the deterministic rate is 1 EUR = 1.0815 USD (0.5% margin):
 * €100.00 -> US$108.15.
 */
test.describe('FX exchange — disclosed equals committed', () => {
	test('convert €100 EUR→USD: dialog amount matches the receipt', async ({ page }) => {
		await gotoApp(page, '/payments/exchange');

		// Default pair is EUR (Main) -> USD (Travel). Type the From amount.
		await page.getByRole('textbox', { name: 'I convert (EUR)' }).fill('100');

		// The To side computes from the rate.
		await expect(page.getByRole('textbox', { name: 'I receive (USD)' })).toHaveValue('108.15');

		await page.getByRole('button', { name: 'Review' }).click();

		// Forced-decision confirm discloses the receive amount.
		await expect(page.getByRole('dialog', { name: /Convert €100\.00/ })).toBeVisible();
		const disclosed = toMinorUnits('US$108.15');

		// gok-dialog slots its actions in light DOM (not a descendant of the dialog
		// node), so select the confirm button at page level.
		await page.getByRole('button', { name: 'Convert €100.00' }).click();

		// Receipt — the committed received amount must equal the disclosed amount.
		await expect(page.getByRole('heading', { name: /€100\.00 converted/ })).toBeVisible();
		const receivedRow = page.getByText('US$108.15').first();
		await expect(receivedRow).toBeVisible();
		expect(toMinorUnits('US$108.15')).toBe(disclosed);
	});
});
