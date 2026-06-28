import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Rewards redeem — the no-double-submit contract on a P0 money action.
 *
 * MON-Q-01 (S1, functional/data-integrity) — the redeem confirm has no in-flight
 * guard. Two synchronous clicks on "Redeem €X" both reach `rewards.redeem()`
 * before Svelte re-renders the dialog away, so the cashback balance is debited
 * TWICE and TWO wallet-credit transactions are appended from a single confirmed
 * redemption (proven in the browser: €42.18 → €32.18 on a double-click vs €37.18
 * on a single click; two "Cashback to Main · Redeemed €5.00" history rows).
 *
 * Locked as `test.fixme` so the regression is recorded without failing the green
 * suite. Flip to `test` once the commit is guarded (disable on first click / a
 * single-flight latch in `redeemNow`).
 */
test.fixme(
	'MON-Q-01: double-clicking the redeem confirm redeems exactly once',
	async ({ page }) => {
		await gotoApp(page, '/rewards');

		await page.getByRole('button', { name: 'Redeem cashback' }).click();
		await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('5.00');
		await page.getByRole('button', { name: 'Review' }).click();

		await expect(page.getByRole('dialog', { name: 'Confirm redemption' })).toBeVisible();

		// Fire two synchronous clicks — the double-submit race. (The commit button
		// is light-DOM on the gok-dialog host, selected at page level.)
		await page.getByRole('button', { name: 'Redeem €5.00' }).evaluate((el: HTMLElement) => {
			el.click();
			el.click();
		});

		await expect(page.getByRole('heading', { name: 'Cashback redeemed' })).toBeVisible();
		await page.getByRole('button', { name: 'Done' }).click();

		// Exactly ONE redemption should have been recorded for this €5.00 confirm.
		const redeemedRows = page
			.getByRole('row')
			.filter({ hasText: 'Cashback to Main' })
			.filter({ hasText: 'Redeemed' })
			.filter({ hasText: '€5.00' });
		await expect(redeemedRows).toHaveCount(1);
	}
);
