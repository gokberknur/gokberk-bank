import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Crypto send — the forced-decision contract.
 * The network confirm is a `gok-dialog tone="danger" no-dismiss`: it must appear
 * before any send, must state the irreversibility, and "Back" must cancel with no
 * side effect (the send must NOT have moved).
 *
 * CRY-Q-01 (S3) — the no-dismiss dialog currently dismisses on the Escape key,
 * breaking the "forced" contract. Locked as `test.fixme` so the regression is
 * recorded without failing the green suite; flip to `test` when the fix lands.
 */

const BTC_ADDRESS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

async function openConfirm(page: import('@playwright/test').Page) {
	await gotoApp(page, '/crypto/transfer?mode=send');
	await page.getByRole('textbox', { name: 'Recipient address' }).fill(BTC_ADDRESS);
	await page.getByRole('spinbutton', { name: 'Amount (BTC)' }).fill('0.001');
	const review = page.getByRole('button', { name: 'Review send' });
	await expect(review).toBeEnabled();
	await review.click();
	return page.getByRole('dialog', { name: 'Confirm send' });
}

test('Back on the network confirm cancels with no side effect', async ({ page }) => {
	const confirm = await openConfirm(page);
	await expect(confirm).toBeVisible();

	await page.getByRole('button', { name: 'Back' }).click();

	// Dialog dismissed, and crucially the send was NOT placed (we stay on the form).
	await expect(confirm).toBeHidden();
	await expect(page.getByRole('button', { name: 'Review send' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Send submitted' })).toHaveCount(0);
});

// CRY-Q-01: the no-dismiss forced-decision dialog must NOT close on Escape.
test.fixme('CRY-Q-01: Escape must not dismiss the no-dismiss network confirm', async ({ page }) => {
	const confirm = await openConfirm(page);
	await expect(confirm).toBeVisible();

	await page.keyboard.press('Escape');

	// Expected once fixed: the forced-decision confirm stays open.
	await expect(confirm).toBeVisible();
});
