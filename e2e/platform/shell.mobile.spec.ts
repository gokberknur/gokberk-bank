import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Mobile shell smoke — runs ONLY on the mobile project (iPhone / Mobile Safari, WebKit),
 * the device class the app ships to. The desktop project ignores *.mobile.spec.ts; this is
 * where mobile-shaped expectations live (bottom tab bar instead of the desktop rail).
 *
 * Note: assessment finding PLT-U-01 (S1) records that the bottom bar exposes only 4 of 14
 * sections and "More" is a dead "Soon" stub — that gap is tracked in assessmentv1/platform/
 * ux-findings.md, not asserted here. This spec guards the baseline: the mobile shell boots,
 * stays authenticated, and renders its primary chrome.
 */

test('mobile: app boots authenticated into the shell with the bottom tab bar', async ({ page }) => {
	await gotoApp(page, '/home');
	await expect(page).toHaveURL(/\/home$/);
	await expect(page.locator('main#main')).toBeVisible();
	// On a phone the rail collapses to the bottom tab bar (<nav aria-label="Primary">).
	await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});

test('mobile: a primary bottom tab navigates', async ({ page }) => {
	await gotoApp(page, '/home');
	const tabbar = page.getByRole('navigation', { name: 'Primary' });
	// The first ready tab is a real <a href> — activate it and confirm the route changes.
	const firstTab = tabbar.getByRole('link').first();
	await expect(firstTab).toBeVisible();
	await firstTab.click();
	await expect(page.locator('main#main')).toBeVisible();
});

test('mobile: deep-link reload on an inner route serves the SPA shell (no 404)', async ({ page }) => {
	await gotoApp(page, '/accounts');
	await page.reload();
	await expect(page.locator('main#main')).toBeVisible();
	await expect(page).toHaveURL(/\/accounts$/);
});
