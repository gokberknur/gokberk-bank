import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * Home dashboard (X01) — the launchpad. It is read-only: no money moves here, but
 * every block must deep-link to its live surface and the headline figures must be
 * truthful.
 *
 * Green guards: the page renders its signature blocks, and the four quick actions
 * each navigate to a live payments surface.
 *
 * Two regressions are recorded as fixme (they currently fail — see qa-findings):
 *  - PLT-Q-01: the "See budgets"/"See all activity" CTAs are disabled "Soon" even
 *    though /budgets and /activity are live and in the sidenav.
 *  - PLT-Q-03: the "Net worth" headline excludes the investment portfolio, so it
 *    does not equal cash + savings + investments as the spec requires.
 */

test('home renders the launchpad blocks', async ({ page }) => {
	await gotoApp(page, '/home');
	await expect(page.getByRole('heading', { level: 1, name: /Good to see you/ })).toBeVisible();
	await expect(page.getByText('Net worth').first()).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Start something' })).toBeVisible();
	await expect(page.getByText('Total across wallets')).toBeVisible();
});

test('quick actions each launch a live payments surface', async ({ page }) => {
	const cases: Array<[string, RegExp]> = [
		['Send', /\/payments\/transfer$/],
		['Request', /\/payments\/request$/],
		['Top up', /\/payments\/topup$/],
		['Exchange', /\/payments\/exchange$/]
	];
	for (const [label, url] of cases) {
		await gotoApp(page, '/home');
		await page.getByRole('button', { name: label, exact: true }).click();
		await expect(page).toHaveURL(url);
		await expect(page.locator('main#main')).toBeVisible();
	}
});

test(
	'PLT-Q-01: spend + activity blocks deep-link to their live surfaces (not disabled "Soon")',
	async ({ page }) => {
		await gotoApp(page, '/home');
		// Both /budgets and /activity are live (in the sidenav) — these CTAs must be
		// enabled, navigating buttons, not disabled "Soon" stubs.
		const seeBudgets = page.getByRole('button', { name: 'See budgets' });
		await expect(seeBudgets).toBeEnabled();
		await seeBudgets.click();
		await expect(page).toHaveURL(/\/budgets$/);

		await gotoApp(page, '/home');
		const seeActivity = page.getByRole('button', { name: 'See all activity' });
		await expect(seeActivity).toBeEnabled();
		await seeActivity.click();
		await expect(page).toHaveURL(/\/activity$/);
	}
);

test(
	'PLT-Q-03: net worth headline includes the investment portfolio',
	async ({ page }) => {
		await gotoApp(page, '/invest');
		const portfolio = toMinorUnits(
			(await page.getByRole('heading', { level: 1 }).first().textContent()) ?? ''
		);
		expect(portfolio).not.toBeNull();

		await gotoApp(page, '/home');
		const netWorth = toMinorUnits(
			(await page.locator('.figure').first().textContent()) ?? ''
		);
		expect(netWorth).not.toBeNull();
		// The home "Net worth" must be at least the portfolio value — currently it
		// excludes investments entirely, so it is far smaller.
		expect(netWorth as number).toBeGreaterThanOrEqual(portfolio as number);
	}
);
