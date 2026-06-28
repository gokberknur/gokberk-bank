import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * Crypto buy — the money spine: gather → cost preview → forced-decision confirm →
 * settled, in activity. Proves the disclosed cost reconciles (total = gross + fee)
 * and the buy actually lands. The receipt's omission of the fee/total is tracked as
 * CRY-Q-03 (S4) — not asserted here so the green net stays honest.
 */

/** Pull "<label> €<amount>" out of a container's flat text, in minor units. */
function field(text: string, label: string): number | null {
	const m = text.match(new RegExp(`${label}\\s*€\\s*([\\d.,]+)`));
	return m ? toMinorUnits(m[1]) : null;
}

test('buy 0.01 BTC: cost preview reconciles and the order settles into activity', async ({
	page
}) => {
	await gotoApp(page, '/crypto');

	await page
		.getByRole('region', { name: 'Crypto actions' })
		.getByRole('button', { name: 'Buy' })
		.click();

	const amount = page.getByRole('spinbutton', { name: 'Amount in BTC' });
	await expect(amount).toBeVisible();
	await amount.fill('0.01');

	// Disclosed cost reconciles to the cent: total cost == gross amount + fee.
	const preview = page.locator('.preview');
	await expect(preview).toContainText('Total cost');
	const text = (await preview.innerText()).replace(/\s+/g, ' ');
	const gross = field(text, 'Amount');
	const fee = field(text, 'Fee');
	const total = field(text, 'Total cost');
	expect(gross).not.toBeNull();
	expect(total).toBe((gross ?? 0) + (fee ?? 0));

	// Forced-decision confirm names the asset/amount.
	await page.getByRole('button', { name: 'Review buy' }).click();
	const confirm = page.getByRole('dialog', { name: 'Confirm buy' });
	await expect(confirm).toBeVisible();
	// The confirm body is slotted light DOM (not a descendant of the shadow <dialog>),
	// so assert it directly by its class rather than scoping under the dialog role.
	await expect(page.locator('.confirm-body')).toContainText('0.01 BTC');

	await page.getByRole('button', { name: 'Buy BTC' }).click();

	// Settled — the success receipt + a fresh "today / Buy / BTC" activity row.
	await expect(page.getByRole('heading', { name: 'Order placed' })).toBeVisible();
	await expect(page.getByRole('row', { name: /today Buy BTC \+0\.01 BTC/ })).toBeVisible();
});
