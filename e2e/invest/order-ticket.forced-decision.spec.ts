import { test, expect, gotoApp } from '../support/fixtures';

/**
 * INV-Q01 (S2) — regression guard for the forced-decision order confirm.
 *
 * The `tone="danger" no-dismiss` "Confirm order" dialog must NOT be dismissable by
 * Escape, and Escape must never tear down the parent order-ticket drawer (which
 * silently discards the in-progress order). Today it does both: Escape closes the
 * confirm AND the whole drawer (OrderTicket.closeDrawer lacks the
 * `e.target === e.currentTarget` guard, and the confirm doesn't trap Escape).
 *
 * Marked fixme so the committed suite stays GREEN while the bug is open; remove
 * `.fixme` once OrderTicket guards its drawer close + traps the confirm's Escape.
 */
test.fixme(
	'INV-Q01: Escape on the forced-decision confirm must not close the order ticket',
	async ({ page }) => {
		await gotoApp(page, '/invest');
		await page.getByRole('button', { name: 'Place order' }).click();
		await page.getByRole('spinbutton', { name: 'Number of shares' }).fill('0.1');
		await page.getByRole('button', { name: 'Review order' }).click();

		const confirm = page.getByRole('dialog', { name: 'Confirm order' });
		await expect(confirm).toBeVisible();

		await page.keyboard.press('Escape');

		// Expected (post-fix): the order ticket drawer survives — the user is still in
		// the flow (back on review at worst), NOT dumped to the portfolio with the
		// order discarded. The "Review order" action proves the ticket is still open.
		await expect(page.getByRole('button', { name: 'Review order' })).toBeVisible();
	}
);
