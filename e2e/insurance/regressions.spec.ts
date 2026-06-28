import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Locked regressions for confirmed insurance defects. These are marked test.fixme
 * because they assert the FIXED behaviour, which currently fails — they document
 * the bug and will start guarding it the moment it's fixed (flip fixme → run).
 * See assessmentv1/insurance/qa-findings.md.
 */
test.describe('insurance · regressions', () => {
	// INS-Q-01 — `gok-button variant="ghost"` is invalid and silently falls back to
	// `primary`, so the destructive "Cancel policy" trigger rendered as a solid-green
	// accent button. Fixed by using `secondary`: the destructive trigger must be a
	// quiet (neutral) action — the danger is carried by the forced-decision dialog it
	// opens, never by painting the trigger as the green accent. (Same fix on the claim
	// "Withdraw claim" button.)
	test('INS-Q-01: Cancel policy trigger is a quiet (secondary) action, not the accent', async ({
		page
	}) => {
		await gotoApp(page, '/insurance/policies/pol-device');
		// The first "Cancel policy" gok-button is the page trigger (the confirm dialog's
		// is later in the DOM and only renders when opened).
		const cancel = page.locator('gok-button').filter({ hasText: 'Cancel policy' }).first();
		await expect(cancel).toBeVisible();
		await expect(cancel).toHaveAttribute('variant', 'secondary');
	});

	// INS-Q-02 — the forced-decision cancel dialog is `no-dismiss`, but pressing
	// Escape still closes it (the page wires gok-cancel → close and gok-dialog emits
	// gok-cancel on Escape even when no-dismiss). A forced-decision dialog must not
	// be escapable.
	test('INS-Q-02: Escape does not dismiss the no-dismiss cancel dialog', async ({ page }) => {
		await gotoApp(page, '/insurance/policies/pol-device');
		await page.getByRole('button', { name: 'Cancel policy' }).first().click();
		const dialog = page.getByRole('dialog', { name: /Cancel my .* policy\?/ });
		await expect(dialog).toBeVisible();
		await page.keyboard.press('Escape');
		// Forced-decision: it must STILL be open after Escape.
		await expect(dialog).toBeVisible();
	});
});
