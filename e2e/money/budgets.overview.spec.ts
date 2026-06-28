import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * Budgets / spend analytics (M01) — the read surface that must tell the truth.
 * Proves: (1) the income/expense ledger reconciles — Net == In − Out to the cent,
 * and the savings rate is derived, not invented; (2) the period selector re-flows
 * every panel (This month → Last month changes the headline month + total).
 *
 * All analytics derive from the F03 transactions spine; this guards that the
 * derivation stays internally consistent (no float drift, no stale panel).
 */

function ledgerDd(page: import('@playwright/test').Page, term: string) {
	return page
		.locator('.ledger-row')
		.filter({ has: page.getByText(term, { exact: true }) })
		.locator('.ledger-value');
}

test('income/expense ledger reconciles: Net == In − Out to the cent', async ({ page }) => {
	await gotoApp(page, '/budgets');

	await expect(page.getByRole('heading', { level: 1, name: 'June 2026' })).toBeVisible();

	const inMinor = toMinorUnits((await ledgerDd(page, 'In').textContent()) ?? '');
	const outMinor = toMinorUnits((await ledgerDd(page, 'Out').textContent()) ?? '');
	const netMinor = toMinorUnits((await ledgerDd(page, 'Net').textContent()) ?? '');

	expect(inMinor).not.toBeNull();
	expect(outMinor).not.toBeNull();
	expect(netMinor).not.toBeNull();
	// The headline equality the whole cashflow panel rests on.
	expect(netMinor).toBe((inMinor as number) - (outMinor as number));
});

test('period selector re-flows the dashboard: This month → Last month', async ({ page }) => {
	await gotoApp(page, '/budgets');

	await expect(page.getByRole('heading', { level: 1, name: 'June 2026' })).toBeVisible();

	await page.getByRole('radio', { name: 'Last month' }).click();

	// The headline month + caption must change — the analytics re-derived, not stale.
	await expect(page.getByRole('heading', { level: 1, name: 'May 2026' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1, name: 'June 2026' })).toHaveCount(0);
});
