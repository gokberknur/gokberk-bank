import { test, expect } from '../support/fixtures';

/**
 * IDN-Q-02 — deep-linking / reloading the `/settings` section root currently 404s
 * (no index page, no redirect), unlike `/security` which redirects to its first
 * child. This documents the expected redirect; un-skip once `/settings` resolves.
 *
 * Spec: regression-checklist "deep-linking the route directly … doesn't 404".
 */
test.fixme('IDN-Q-02: /settings resolves (redirects to a child) instead of 404', async ({ page }) => {
	await page.goto('/settings');
	// Expected: redirected into a real settings child (e.g. /settings/preferences),
	// not stranded on the 404 page.
	await expect(page).toHaveURL(/\/settings\/(preferences|appearance|notifications)$/);
	await expect(page.getByRole('heading', { name: '404' })).toHaveCount(0);
});

// Control: the children themselves are reachable today.
test('settings children load on direct navigation', async ({ page }) => {
	for (const child of ['/settings/preferences', '/settings/appearance', '/settings/notifications']) {
		await page.goto(child);
		await expect(page.locator('main#main')).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`${child.replace(/\//g, '\\/')}$`));
	}
});
