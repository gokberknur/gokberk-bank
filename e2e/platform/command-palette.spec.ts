import { test, expect, gotoApp } from '../support/fixtures';
import type { Page, Locator } from '@playwright/test';

/**
 * Global command menu (X03) — the power-user spine, now on the DS `gok-command-menu`
 * (external-filtering: the app ranks, the element owns the overlay/keyboard/a11y).
 * Opened from the navbar Search affordance (and the element's built-in $mod+K). Must:
 * open with focus in the combobox, fuzzy-search across sources grouped with section
 * eyebrows, distinguish no-results from empty-query, and close on Escape.
 *
 * PLT-Q-02 (regression lock): the default-highlighted result (the Enter target) must
 * follow the global match score, so an exact-prefix match wins over a weak fuzzy match
 * in another section. The ranking orders sections by their best member's score, and
 * the element defaults the active option to the first rendered option.
 *
 * Assertions scope to the menu dialog so section eyebrows (e.g. "Accounts") don't
 * collide with the page's own nav chrome.
 */

async function openMenu(page: Page): Promise<Locator> {
	// Desktop: the centered "Search the app" field in the top nav opens the menu (the
	// right-corner search icon is desktop-hidden). The tablet/mobile icon stays named "Search".
	await page.getByRole('button', { name: 'Search the app' }).click();
	const menu = page.getByRole('dialog', { name: 'Search the app' });
	await expect(menu.getByRole('combobox', { name: 'Search the app' })).toBeVisible();
	return menu;
}

test('menu opens from the navbar and shows suggested actions on empty query', async ({ page }) => {
	await gotoApp(page, '/home');
	const menu = await openMenu(page);
	await expect(menu.getByText(/suggested/i).first()).toBeVisible();
	await expect(menu.getByRole('option', { name: 'Send money' })).toBeVisible();
});

test('typing fuzzy-matches across sources, grouped with section eyebrows', async ({ page }) => {
	await gotoApp(page, '/home');
	const menu = await openMenu(page);
	await menu.getByRole('combobox', { name: 'Search the app' }).fill('main');
	// The exact-prefix wallet match is surfaced…
	await expect(menu.getByRole('option', { name: /Main · EUR/ })).toBeVisible();
	// …under its section eyebrow (scoped to the menu, not the sidebar nav).
	await expect(menu.getByText('Accounts', { exact: true })).toBeVisible();
});

test('no-results state is distinct from the empty-query state', async ({ page }) => {
	await gotoApp(page, '/home');
	const menu = await openMenu(page);
	await menu.getByRole('combobox', { name: 'Search the app' }).fill('zzzqqxnomatch');
	await expect(menu.getByText(/no matches/i).first()).toBeVisible();
	await expect(menu.getByText(/suggested/i)).toHaveCount(0);
	await expect(menu.getByRole('option')).toHaveCount(0);
});

test('Escape closes the menu', async ({ page }) => {
	await gotoApp(page, '/home');
	const menu = await openMenu(page);
	const box = menu.getByRole('combobox', { name: 'Search the app' });
	await box.focus();
	await box.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Search the app' })).not.toBeVisible();
});

test('PLT-Q-02: an exact-prefix match is the default (Enter) result, not a weak fuzzy match', async ({
	page
}) => {
	await gotoApp(page, '/home');
	const menu = await openMenu(page);
	// "AAPL" is an exact prefix of the Apple instrument; it must be the Enter target,
	// not a weaker fuzzy match in another section.
	await menu.getByRole('combobox', { name: 'Search the app' }).fill('AAPL');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/invest\/instrument\/AAPL$/i);
});
