import { test, expect, gotoApp } from '../support/fixtures';

/**
 * SVC-U-2 (mobile reachability): "Raise a ticket" was buried ~2.4 viewports down with no shortcut.
 * A header-level shortcut now jumps to the ticket form. The shortcut must be reachable at rest, and
 * using it must bring the form into view. Runs only on the mobile (WebKit) project.
 */
test('SVC-U-2: the header shortcut scrolls the raise-a-ticket form into view', async ({ page }) => {
	await gotoApp(page, '/support');
	const shortcut = page.getByRole('button', { name: 'Raise a ticket' });
	await expect(shortcut).toBeInViewport();
	await shortcut.click();
	await expect(page.getByRole('heading', { name: 'Raise a ticket' })).toBeInViewport();
});
