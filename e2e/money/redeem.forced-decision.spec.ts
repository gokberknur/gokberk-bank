import { test, expect, gotoApp } from '../support/fixtures';

/**
 * MON-Q-02 (S2) — the no-dismiss "Confirm redemption" forced-decision dialog must not
 * be dismissable by Escape, and Escape must not tear down the redeem drawer or discard
 * the in-progress amount (dogfooding #33). Fixed by guarding the drawer's close handler
 * on `e.target === e.currentTarget` and removing the confirm's gok-cancel/gok-close
 * wiring so Escape has no listener.
 */
test('MON-Q-02: Escape on the redeem confirm does not dismiss it or tear down the drawer', async ({
	page
}) => {
	await gotoApp(page, '/rewards');

	await page.getByRole('button', { name: 'Redeem cashback' }).click();
	await page.getByRole('textbox', { name: 'Amount (EUR)' }).fill('5.00');
	await page.getByRole('button', { name: 'Review' }).click();

	const confirm = page.getByRole('dialog', { name: 'Confirm redemption' });
	await expect(confirm).toBeVisible();

	await page.keyboard.press('Escape');

	// Forced-decision: the confirm stays open after Escape, and the flow survives — the
	// commit button (which carries the entered €5.00) is still there.
	await expect(confirm).toBeVisible();
	await expect(page.getByRole('button', { name: 'Redeem €5.00' })).toBeVisible();
});
