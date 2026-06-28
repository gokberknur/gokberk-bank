import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * V03 — the order-ticket money spine (P0). Proves the full gather → live cost
 * preview → forced-decision confirm (+ step-up) → Done path completes, and that the
 * amount DISCLOSED on the confirm dialog equals the amount COMMITTED on the receipt,
 * to the cent. This is the single highest-value invest check: a drift here is money.
 *
 * The /invest "Place order" quick action opens a Buy ticket for the top holding (BTC).
 * 0.1 BTC clears buying power AND exceeds the €1,000 step-up threshold, so the spec
 * also locks that the commit stays gated until "Approve with passkey".
 */
test('order ticket: disclosed total equals committed receipt total (with step-up)', async ({
	page
}) => {
	await gotoApp(page, '/invest');

	await page.getByRole('button', { name: 'Place order' }).click();

	// Gather: 0.1 shares of BTC.
	await page.getByRole('spinbutton', { name: 'Number of shares' }).fill('0.1');

	// Review → the forced-decision confirm. (The gok-dialog projects its body/footer
	// as light-DOM slots, so we read them at page level, not under the shadow host.)
	await page.getByRole('button', { name: 'Review order' }).click();
	const confirmBody = page.getByText(/BTC for ~/);
	await expect(confirmBody).toBeVisible();

	// The disclosed grand total — the amount in the "… for ~€X?" confirm question.
	const disclosedText = (await confirmBody.textContent()) ?? '';
	const disclosed = toMinorUnits(disclosedText.match(/€[\d.,]+/)?.[0] ?? '');
	expect(disclosed, `parsed confirm total from "${disclosedText}"`).not.toBeNull();
	expect(disclosed!).toBeGreaterThan(0);

	// Step-up gate: the commit primary stays disabled until identity is approved.
	const commit = page.getByRole('button', { name: 'Buy BTC' });
	await expect(commit).toBeDisabled();
	await page.getByRole('button', { name: 'Approve with passkey' }).click();
	await expect(commit).toBeEnabled();

	// Commit.
	await commit.click();

	// Done: honest terminal state + the receipt total must equal the disclosed total.
	await expect(page.getByRole('heading', { name: 'Order placed' })).toBeVisible();
	const receiptTotalText =
		(await page
			.getByText('Estimated total', { exact: true })
			.locator('xpath=following-sibling::dd')
			.textContent()) ?? '';
	const committed = toMinorUnits(receiptTotalText);
	expect(committed, `parsed receipt total from "${receiptTotalText}"`).not.toBeNull();
	expect(committed).toBe(disclosed);
});
