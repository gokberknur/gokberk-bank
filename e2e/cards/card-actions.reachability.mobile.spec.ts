import { test, expect, gotoApp } from '../support/fixtures';

/**
 * CARD-U-01 (mobile reachability): the card-detail actions sat below a tall card-art hero on a
 * phone. The reveal + settings actions are now pinned in a sticky action bar, so the primary
 * "Show card number" must be in the viewport at rest. card-physical exists in the seed. Runs only
 * on the mobile (WebKit) project.
 */
test('CARD-U-01: card actions are reachable without scrolling on mobile', async ({ page }) => {
	await gotoApp(page, '/cards/card-physical');
	await expect(page.getByRole('button', { name: 'Show card number' })).toBeInViewport();
});
