import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Locked regressions for confirmed insurance defects. These are marked test.fixme
 * because they assert the FIXED behaviour, which currently fails — they document
 * the bug and will start guarding it the moment it's fixed (flip fixme → run).
 * See assessmentv1/insurance/qa-findings.md.
 */
test.describe('insurance · regressions', () => {
	// INS-Q-01 — `gok-button variant="ghost"` is invalid and silently falls back to
	// `primary`, so the destructive "Cancel policy" renders as a solid-green accent
	// button next to the reversible "Renew policy". The accent must NOT sit on the
	// destructive action. (Same root cause on the claim "Withdraw claim" button.)
	test.fixme(
		'INS-Q-01: Cancel policy is not the solid-green accent button',
		async ({ page }) => {
			await gotoApp(page, '/insurance/policies/pol-device');
			const cancel = page.getByRole('button', { name: 'Cancel policy' }).first();
			const renew = page.getByRole('button', { name: 'Renew policy' });
			await expect(cancel).toBeVisible();
			await expect(renew).toBeVisible();
			// The accent (primary) belongs to at most the constructive action; the
			// destructive Cancel must read quieter than a solid-green primary.
			const cancelBg = await cancel.evaluate((el) => getComputedStyle(el).backgroundColor);
			const renewBg = await renew.evaluate((el) => getComputedStyle(el).backgroundColor);
			expect(cancelBg).not.toBe(renewBg); // currently identical-tier; both go through primary fallback
		}
	);

	// INS-Q-02 — the forced-decision cancel dialog is `no-dismiss`, but pressing
	// Escape still closes it (the page wires gok-cancel → close and gok-dialog emits
	// gok-cancel on Escape even when no-dismiss). A forced-decision dialog must not
	// be escapable.
	test.fixme('INS-Q-02: Escape does not dismiss the no-dismiss cancel dialog', async ({ page }) => {
		await gotoApp(page, '/insurance/policies/pol-device');
		await page.getByRole('button', { name: 'Cancel policy' }).first().click();
		const dialog = page.getByRole('dialog', { name: /Cancel my .* policy\?/ });
		await expect(dialog).toBeVisible();
		await page.keyboard.press('Escape');
		// Forced-decision: it must STILL be open after Escape.
		await expect(dialog).toBeVisible();
	});
});
