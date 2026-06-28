import { test, expect, gotoApp } from '../support/fixtures';
import type { Page } from '@playwright/test';

/**
 * Global command palette (X03) — the power-user spine. Opened from the navbar
 * Search affordance (and Cmd/Ctrl-K). Must: open with focus in the input, fuzzy
 * search across sources grouped with eyebrows, distinguish no-results from
 * empty-query, and close on Escape.
 *
 * Recorded regression (fixme — currently fails, see qa-findings PLT-Q-02): the
 * default-highlighted result (the Enter target) ignores the global match score
 * because rendering follows a fixed group order, so an exact-prefix match is
 * buried below a weak fuzzy match in an earlier group.
 */

async function openPalette(page: Page) {
	await page.getByRole('button', { name: 'Search', exact: true }).click();
	await expect(page.getByRole('searchbox', { name: 'Search the app' })).toBeVisible();
}

test('palette opens from the navbar and shows suggested actions on empty query', async ({
	page
}) => {
	await gotoApp(page, '/home');
	await openPalette(page);
	await expect(page.getByText('SUGGESTED')).toBeVisible();
	await expect(page.getByRole('option', { name: 'Send money' })).toBeVisible();
});

test('typing fuzzy-matches across sources, grouped with eyebrows', async ({ page }) => {
	await gotoApp(page, '/home');
	await openPalette(page);
	await page.getByRole('searchbox', { name: 'Search the app' }).fill('main');
	// The exact-prefix account match is surfaced (in the Accounts group)...
	await expect(page.getByRole('option', { name: /Main · EUR/ })).toBeVisible();
	await expect(page.getByText('ACCOUNTS', { exact: true })).toBeVisible();
});

test('no-results state is distinct from the empty-query state', async ({ page }) => {
	await gotoApp(page, '/home');
	await openPalette(page);
	await page.getByRole('searchbox', { name: 'Search the app' }).fill('zzzqqxnomatch');
	await expect(page.locator('.empty-title')).toBeVisible();
	await expect(page.getByText('SUGGESTED')).toHaveCount(0);
	await expect(page.getByRole('option')).toHaveCount(0);
});

test('Escape closes the palette', async ({ page }) => {
	await gotoApp(page, '/home');
	await openPalette(page);
	const box = page.getByRole('searchbox', { name: 'Search the app' });
	await box.focus();
	await box.press('Escape');
	await expect(box).toHaveCount(0);
});

test.fixme(
	'PLT-Q-02: an exact-prefix match is the default (Enter) result, not a weak fuzzy match',
	async ({ page }) => {
		await gotoApp(page, '/home');
		await openPalette(page);
		// "AAPL" is an exact prefix of the Apple instrument; it must be the Enter
		// target. Currently a fuzzy payee match in an earlier group is highlighted,
		// so Enter routes to /payments/payees instead of the instrument.
		await page.getByRole('searchbox', { name: 'Search the app' }).fill('AAPL');
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/\/invest\/instrument\/AAPL$/i);
	}
);
