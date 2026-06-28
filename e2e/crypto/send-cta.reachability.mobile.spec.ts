import { test, expect, gotoApp } from '../support/fixtures';

/**
 * CRY-U-01 (mobile reachability): the crypto Send flow's "Review send" CTA sat ~1.7× the fold
 * down. SendPanel's action row is now sticky on mobile, so "Review send" must be in the viewport
 * at rest on a phone. Runs only on the mobile (WebKit) project.
 */
test('CRY-U-01: Review send is reachable without scrolling on mobile', async ({ page }) => {
	await gotoApp(page, '/crypto/transfer?mode=send');
	await expect(page.getByRole('button', { name: 'Review send' })).toBeInViewport();
});
