import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Infra smoke test — proves the E2E harness actually drives the SPA:
 *  - the dev server boots and serves the SPA fallback,
 *  - the demo lands authenticated (no bounce to /login),
 *  - the persistent shell (rail/navbar/main) renders,
 *  - the primary nav routes load their own content.
 *
 * This is the canary the rest of the suite builds on. If it fails, fix the harness
 * before trusting any domain spec.
 */

const PRIMARY_ROUTES = [
	'/home',
	'/accounts',
	'/payments',
	'/cards',
	'/invest',
	'/lending'
];

test('app boots authenticated into the shell', async ({ page }) => {
	await gotoApp(page, '/home');
	// The soft auth guard would redirect an unauthenticated user to /login.
	await expect(page).toHaveURL(/\/home$/);
	await expect(page.locator('main#main')).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

for (const route of PRIMARY_ROUTES) {
	test(`primary route loads: ${route}`, async ({ page }) => {
		await gotoApp(page, route);
		await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}$`));
		await expect(page.locator('main#main')).toBeVisible();
		// Deep-linking a route directly must not 404 (SPA fallback serves it) and must
		// not strand on /login.
		await expect(page).not.toHaveURL(/\/login/);
	});
}

test('deep-link reload on an inner route serves the SPA shell (no 404)', async ({ page }) => {
	await gotoApp(page, '/accounts');
	await page.reload();
	await expect(page.locator('main#main')).toBeVisible();
	await expect(page).toHaveURL(/\/accounts$/);
});
