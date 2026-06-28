import { test, expect, gotoApp } from '../support/fixtures';

/**
 * LEND-U-02 (mobile): the mortgage calculator stacked its result below all inputs, so the monthly
 * payment scrolled out of view while adjusting the figures. A compact sticky readout is now pinned
 * at the top on mobile (hidden on desktop, where the results column sits beside the inputs). Runs
 * only on the mobile (WebKit) project.
 */
test('LEND-U-02: the monthly-payment readout stays in view on mobile', async ({ page }) => {
	await gotoApp(page, '/lending/mortgages/calculator');
	await expect(page.locator('.calc-summary')).toBeInViewport();
});
