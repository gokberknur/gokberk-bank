import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared test fixtures for the gökberk bank E2E suite.
 *
 * No auth fixture is needed: the demo boots already signed in (see playwright.config.ts).
 * What we DO control is determinism — the plan tier (Standard/Plus/Metal) changes FX
 * margins and some entitlements, so we pin it before every test via an init script that
 * runs before the app's persistence layer reads localStorage.
 *
 * The persistence layer namespaces keys as `gok-bank-*` and stores JSON, so the tier key
 * is `gok-bank-session-tier` with a JSON-string value (e.g. '"Plus"').
 */

export type Tier = 'Standard' | 'Plus' | 'Metal';

type Fixtures = {
	/** The tier to seed for this test. Override per-test with test.use({ tier: 'Metal' }). */
	tier: Tier;
};

export const test = base.extend<Fixtures>({
	tier: ['Plus', { option: true }],

	page: async ({ page, tier }, use) => {
		// Runs in the page context before any app code, on every navigation in this test.
		await page.addInitScript((t) => {
			window.localStorage.setItem('gok-bank-session-tier', JSON.stringify(t));
		}, tier);
		await use(page);
	}
});

export { expect };

/**
 * Navigate to an (app) route and wait for the SPA shell to have rendered (no blank-flash race).
 * Waits on the shell's <main id="main"> and its first child, which is universal across all
 * pages (only ~3/4 of pages render an <h1>, so we don't depend on one). Asserts we weren't
 * bounced to /login by the soft auth guard.
 */
export async function gotoApp(page: Page, path: string): Promise<void> {
	await page.goto(path);
	const main = page.locator('main#main');
	await main.waitFor({ state: 'attached' });
	await main.locator(':scope > *').first().waitFor({ state: 'visible' });
}
