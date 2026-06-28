import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * Rewards redeem — the M02 money spine: gather (destination + amount, capped at
 * available, reward-early validation) → live review ledger → forced-decision
 * `gok-dialog no-dismiss` confirm → success receipt. Proves the amount disclosed
 * on review and on the confirm equals the amount on the success receipt, to the
 * cent (minor units), and that "Cashback left" reconciles (available − redeemed).
 *
 * Seed cashback balance is €42.18; we redeem €5.00 → €37.18 left.
 */

/** The <dd> value for a unique <dt> term inside a `.row`/ledger line, scoped to a root. */
function ddFor(
	root: import('@playwright/test').Locator,
	page: import('@playwright/test').Page,
	term: string
) {
	return root
		.locator('div.row')
		.filter({ has: page.getByText(term, { exact: true }) })
		.locator('dd');
}

test('redeem €5.00 cashback: disclosed review == confirm == receipt, to the cent', async ({
	page
}) => {
	await gotoApp(page, '/rewards');

	await page.getByRole('button', { name: 'Redeem cashback' }).click();

	const amount = page.getByRole('textbox', { name: 'Amount (EUR)' });
	await expect(amount).toBeVisible();
	await amount.fill('5.00');

	// Live review ledger reconciles: redeem €5.00, €37.18 left of €42.18 available.
	const redeemDd = page.getByRole('definition').filter({ hasText: '€5.00' }).first();
	await expect(redeemDd).toBeVisible();
	await expect(page.getByText('€37.18')).toBeVisible();

	const review = page.getByRole('button', { name: 'Review' });
	await expect(review).toBeEnabled();
	await review.click();

	// Forced-decision confirm appears and names the exact amount on its commit
	// button (the button is light-DOM on the gok-dialog host, so it's selected at
	// page level rather than scoped under the shadow role="dialog").
	await expect(page.getByRole('dialog', { name: 'Confirm redemption' })).toBeVisible();
	const commit = page.getByRole('button', { name: 'Redeem €5.00' });
	await expect(commit).toBeVisible();

	await commit.click();

	// Honest success: a receipt whose Amount equals what was disclosed.
	await expect(page.getByRole('heading', { name: 'Cashback redeemed' })).toBeVisible();
	const receipt = page.locator('.receipt');
	const receiptAmount = (await ddFor(receipt, page, 'Amount').textContent())?.trim() ?? '';
	expect(toMinorUnits(receiptAmount)).toBe(500);
	await expect(ddFor(receipt, page, 'To')).toHaveText('Main');
});
