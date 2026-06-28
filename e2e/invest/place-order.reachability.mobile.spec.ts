import { test, expect, gotoApp } from '../support/fixtures';

/**
 * INV-U-05 (mobile reachability): the portfolio's primary "Place order" action used to sit
 * ~2.4 viewports down. It's now pinned in a sticky action bar (StickyActionBar), so it must be
 * in the viewport at rest on a phone, without scrolling. Runs only on the mobile (WebKit) project.
 */
test('INV-U-05: Place order is reachable without scrolling on mobile', async ({ page }) => {
	await gotoApp(page, '/invest');
	await expect(page.getByRole('button', { name: 'Place order' })).toBeInViewport();
});
