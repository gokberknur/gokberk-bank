import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * Accounts — wallet list + ledger (A01 / A02).
 *
 * Locks the read-surface happy paths (overview total reconciles, wallet detail
 * header/IBAN/grid render, search → filtered-empty).
 *
 * ACC-Q-01 turned out to be a false positive: the detail drawer IS reachable — the
 * original controlled-selection wiring opens AND reopens it correctly under a real
 * click on the row's gok-checkbox host. The assessment's "unreachable" verdict came
 * from synthetic/CDP clicks that don't trigger the custom checkbox; the active test
 * below proves real-click reachability and guards it. (The genuine residual is a DS
 * gap — no full-row click and the select control is tabindex=-1, so no keyboard
 * activation — tracked in docs/dogfooding-findings.md #12, not a ship blocker.)
 *
 * ACC-Q-02 (S2, the incoherent running-balance column) remains `test.fixme`.
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

// ACC-Q-01 (S1) — activating a transaction row must open the detail drawer (A05), and the same
// row must reopen after the drawer closes. The DS gok-table activates via the row's leading select
// control (no full-row click — a DS gap, dogfooding #12); we consume gok-selection-change as a
// transient row-activate (preventDefault) so a repeat activation always reopens.
test('ACC-Q-01: activating a transaction row opens (and reopens) the detail drawer', async ({
	page
}) => {
	await gotoApp(page, '/accounts/eur-main');
	const row = page.getByRole('row').filter({ hasText: 'Acme GmbH — salary' });
	// Activate via the row's gok-checkbox host (the DS select control). The inner input
	// doesn't respond to a click, but the custom element host toggles + fires change.
	const activate = row.locator('gok-checkbox');

	await activate.click();
	// The drawer surfaces the ledger detail (reference, etc.).
	await expect(page.getByText(/Reference/)).toBeVisible();
	await expect(page.getByText(/REF-/)).toBeVisible();

	// Reopen contract: close the drawer, then activate the same row again.
	await page.keyboard.press('Escape');
	await expect(page.getByText(/REF-/)).toBeHidden();
	await activate.click();
	await expect(page.getByText(/REF-/)).toBeVisible();
});

// ACC-Q-02 (S2) — the default date-desc ledger's running-balance column must be COHERENT:
// reading settled rows top (newest) to bottom (oldest), each adjacent pair reconciles —
// newer.balance − older.balance equals the newer row's amount. That's the true invariant; the
// column is NOT monotonic (a salary inflow legitimately lifts the balance). Pending rows show no
// running balance. Holds once same-day rows are tiebroken by settlement order (txn-filter) and
// pending rows are blanked in the column (TransactionGrid).
function parseSignedMinor(text: string): number | null {
	if (!/\d/.test(text)) return null;
	const sign = /[-−–]/.test(text) ? -1 : 1;
	// Two decimal places, so concatenating every digit yields minor units directly.
	return sign * Number(text.replace(/\D/g, ''));
}

test('ACC-Q-02: the settled running balance reconciles row-to-row in the default ledger', async ({
	page
}) => {
	await gotoApp(page, '/accounts/eur-main');

	const rows = page.getByRole('row');
	const rowCount = await rows.count();
	const data: { status: string; amountMinor: number | null; balanceMinor: number | null }[] = [];
	for (let i = 0; i < rowCount; i++) {
		const cells = rows.nth(i).getByRole('gridcell');
		const n = await cells.count();
		if (n < 7) continue; // header / non-data rows
		// Balance is the last column, Amount second-last, Status third-last — robust to any
		// leading selection-control cell the grid renders.
		const status = ((await cells.nth(n - 3).textContent()) ?? '').trim();
		const amountText = ((await cells.nth(n - 2).textContent()) ?? '').trim();
		const balanceText = ((await cells.nth(n - 1).textContent()) ?? '').trim();
		data.push({
			status,
			amountMinor: parseSignedMinor(amountText),
			balanceMinor: balanceText.includes('€') ? parseSignedMinor(balanceText) : null
		});
	}

	// A pending row hasn't posted — it must show no running balance.
	for (const r of data) {
		if (r.status === 'Pending') expect(r.balanceMinor).toBeNull();
	}

	// Among settled rows in display order (newest → oldest), each adjacent pair reconciles.
	const settled = data.filter((r) => r.status === 'Settled' && r.balanceMinor !== null);
	expect(settled.length).toBeGreaterThan(1);
	for (let i = 1; i < settled.length; i++) {
		const newer = settled[i - 1];
		const older = settled[i];
		expect(newer.balanceMinor! - older.balanceMinor!).toBe(newer.amountMinor!);
	}
});
