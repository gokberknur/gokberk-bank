import { test, expect, gotoApp } from '../support/fixtures';

/**
 * INS-U-04 (mobile reachability): an active policy's actions (File a claim / Renew / Cancel) used
 * to be stranded at the bottom of a ~1929px page with no header actions. They're now consolidated
 * into a sticky action bar, so the primary "File a claim" must be in the viewport at rest on a
 * phone. pol-device is an active policy in the seed. Runs only on the mobile (WebKit) project.
 */
test('INS-U-04: policy actions are reachable without scrolling on mobile', async ({ page }) => {
	await gotoApp(page, '/insurance/policies/pol-device');
	await expect(page.getByRole('button', { name: 'File a claim' })).toBeInViewport();
});
