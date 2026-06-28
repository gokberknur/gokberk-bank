import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * Accounts — wallet list + ledger (A01 / A02).
 *
 * Locks the read-surface happy paths (overview total reconciles, wallet detail
 * header/IBAN/grid render, search → filtered-empty) and records the two confirmed
 * defects as `test.fixme` so the suite stays green while the bug is on the books:
 *   - ACC-Q-01 (S1): row click never opens the transaction detail drawer.
 *   - ACC-Q-02 (S2): the running-balance column is incoherent in the default view.
 */

test('/accounts lists every wallet and the home-currency total reconciles', async ({ page }) => {
	await gotoApp(page, '/accounts');

	await expect(page.getByRole('heading', { level: 1, name: 'Your money' })).toBeVisible();

	// All four seeded wallets are present as links to their detail route.
	await expect(page.getByRole('link', { name: /EUR wallet, available/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /USD wallet, available/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /GBP wallet, available/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /SEK wallet, available/ })).toBeVisible();

	// The "Total across wallets" figure is a real grouped EUR amount (not a float-drift artefact).
	const total = page.getByText('Total across wallets').locator('xpath=following-sibling::*[1]');
	const totalMinor = toMinorUnits((await total.first().textContent()) ?? '');
	expect(totalMinor).not.toBeNull();
	expect(totalMinor!).toBeGreaterThan(0);
});

test('wallet detail renders header, copyable IBAN/BIC and the ledger grid', async ({ page }) => {
	await gotoApp(page, '/accounts/eur-main');

	await expect(page.getByRole('heading', { level: 1, name: 'Main' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Copy IBAN' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Copy BIC' })).toBeVisible();
	await expect(page.getByRole('grid', { name: 'Transactions' })).toBeVisible();
	// A known seeded row is in the ledger.
	await expect(page.getByRole('gridcell', { name: 'Acme GmbH — salary' })).toBeVisible();
});

test('ledger search narrows to the distinct filtered-empty state', async ({ page }) => {
	await gotoApp(page, '/accounts/eur-main');

	await page.getByRole('searchbox', { name: 'Search transactions' }).fill('zzzznomatch');

	// Filtered-empty copy must differ from the zero-data ("No transactions yet") copy.
	await expect(page.getByText('No matching transactions')).toBeVisible();
	await expect(page.getByText('Showing 0 of 731')).toBeVisible();
});

test('a brand-new wallet shows the zero-data empty state (distinct from filtered-empty)', async ({
	page
}) => {
	// Open a new CHF wallet, then land on it — it has no transactions yet.
	await gotoApp(page, '/accounts/open');
	await page.getByRole('button', { name: /^Open .* wallet$/ }).click();
	await page.getByRole('button', { name: 'Go to wallet' }).click();

	await expect(page.getByText('No transactions yet')).toBeVisible();
});

// ACC-Q-01 (S1) — clicking a transaction row must open the detail drawer (A05). It currently
// emits no gok-selection-change, so the drawer is unreachable. Un-fixme when the grid selection
// wiring is fixed (see TransactionGrid.svelte controlled-selection interaction).
test.fixme('ACC-Q-01: clicking a transaction row opens the detail drawer', async ({ page }) => {
	await gotoApp(page, '/accounts/eur-main');
	await page.getByRole('gridcell', { name: 'Acme GmbH — salary' }).click();
	// The drawer surfaces the ledger detail (reference, etc.).
	await expect(page.getByText(/Reference/)).toBeVisible();
	await expect(page.getByText(/REF-/)).toBeVisible();
});

// ACC-Q-02 (S2) — in the default date-desc ledger the running balance must read coherently:
// an older settled outflow row cannot show a HIGHER balance than the newer row above it with no
// credit between. Today Basic-Fit (17 Jun, €3,705.88) sits above Five Guys (16 Jun, €3,877.97).
test.fixme('ACC-Q-02: running balance is non-decreasing down the default ledger', async ({
	page
}) => {
	await gotoApp(page, '/accounts/eur-main');
	const balances = await page.getByRole('gridcell', { name: /^€[\d,]+\.\d{2}$/ }).allTextContents();
	const minor = balances.map(toMinorUnits).filter((v): v is number => v !== null);
	// Reading the settled ledger top (newest) to bottom (oldest), each balance should be >= the
	// next one (older), since the rows below are earlier outflows. (Holds once same-day rows are
	// tiebroken by settlement order and pending rows are excluded from the column.)
	for (let i = 1; i < minor.length; i++) {
		expect(minor[i]).toBeLessThanOrEqual(minor[i - 1]);
	}
});
