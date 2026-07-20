import { test, expect, gotoApp } from '../support/fixtures';

/**
 * PLT mobile / WebKit — Phase B navigation pass (bottom-sheet overlays + consistent back nav).
 *
 * Runs on the `mobile` project (iPhone 13, WebKit). Guards the two shape changes users feel:
 * functional overlays rise from the bottom on a phone (patterns.md §9), and detail pages carry a
 * consistent, accessible back affordance to their parent.
 */

test('order ticket opens as a bottom sheet on mobile', async ({ page }) => {
	await gotoApp(page, '/invest/instrument/AAPL?ticket=buy');
	// The instrument page auto-opens the V03 ticket from ?ticket=buy; it must be bottom-anchored.
	await expect(page.locator('gok-drawer[open]')).toHaveAttribute('placement', 'bottom');
});

test('notifications open as a bottom sheet on mobile', async ({ page }) => {
	await gotoApp(page, '/home?notif');
	await expect(page.locator('gok-drawer[open]')).toHaveAttribute('placement', 'bottom');
});

test('a detail page carries a consistent, accessible back link to its parent', async ({ page }) => {
	await gotoApp(page, '/invest/instrument/AAPL');
	// BackLink: accessible name "Back to {parent}", the arrow is decorative; label is canonical.
	const back = page.getByRole('link', { name: 'Back to Investments' });
	await expect(back).toBeVisible();
	await expect(back).toHaveAttribute('href', '/invest');
});

test('the section sub-nav is the shared component (Security)', async ({ page }) => {
	await gotoApp(page, '/security');
	await expect(page.locator('nav[aria-label="Security sections"]')).toBeVisible();
});
