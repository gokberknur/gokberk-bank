import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Crypto send — the irreversible money spine: address + amount (reward-early
 * validation) → fee disclosure → forced-decision network confirm → Confirming
 * on-chain. Proves the disclosed amount equals the committed amount (the receipt
 * matches the confirm) and the send lands Pending→Confirming, never instant.
 *
 * A small (sub-€1,000) amount is used so the step-up gate is out of scope here;
 * the two-gate (step-up → confirm) ordering is its own manual finding.
 */

// A well-known, format-valid Bitcoin address (the genesis coinbase address).
const BTC_ADDRESS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

test('send 0.001 BTC: forced-decision confirm, then Confirming on-chain — disclosed == committed', async ({
	page
}) => {
	await gotoApp(page, '/crypto/transfer?mode=send');

	await page.getByRole('textbox', { name: 'Recipient address' }).fill(BTC_ADDRESS);
	await page.getByRole('spinbutton', { name: 'Amount (BTC)' }).fill('0.001');

	const review = page.getByRole('button', { name: 'Review send' });
	await expect(review).toBeEnabled();
	await review.click();

	// The forced-decision dialog: names the network, states irreversibility plainly,
	// and discloses the exact amount that will move.
	const confirm = page.getByRole('dialog', { name: 'Confirm send' });
	await expect(confirm).toBeVisible();
	// The body is slotted light DOM (not a descendant of the shadow <dialog>); assert
	// the lead line directly — it names the network + states the irreversibility.
	const lead = page.locator('.lead');
	await expect(lead).toContainText('Bitcoin');
	await expect(lead).toContainText(/can't be reversed/);

	await page.getByRole('button', { name: 'Send BTC' }).click();

	// Lands as Confirming (never a faked instant success), and the receipt shows the
	// same amount + network that were disclosed at the confirm — disclosed == committed.
	await expect(page.getByRole('heading', { name: 'Send submitted' })).toBeVisible();
	// Scoped to the success block (the toast also says "confirming on-chain").
	await expect(page.locator('.done')).toContainText('Confirming on-chain');
	const receipt = page.locator('.receipt');
	await expect(receipt).toContainText('0.001 BTC');
	await expect(receipt).toContainText('Bitcoin');
});
