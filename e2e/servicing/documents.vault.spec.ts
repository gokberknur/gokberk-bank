import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Documents vault (D01) — the canonical store. Locks: the list renders, the type filter
 * and search narrow it (filtered-empty has distinct copy), and a document opens in the
 * viewer drawer AND re-opens after closing (the controlled-selection reopen contract,
 * dogfooding #12).
 *
 * Also records SVC-Q-02 as a fixme: a freshly e-signed document does not persist its
 * signed status to the vault across a reload, even though the signing SESSION does — so
 * the two surfaces disagree.
 */

test('the vault lists, filters, and reaches the filtered-empty state', async ({ page }) => {
	await gotoApp(page, '/documents');

	await expect(page.getByRole('heading', { name: 'My documents' })).toBeVisible();
	// The type facets carry live counts.
	await expect(page.getByRole('button', { name: /All 12/ })).toBeVisible();

	// A nonsense search yields the distinct filtered-empty copy (not the zero-data copy).
	await page.getByRole('searchbox', { name: 'Search documents' }).fill('zzzqqq-no-match');
	await expect(page.getByText('No documents match')).toBeVisible();
});

test('a document opens in the viewer and re-opens after close (reopen contract)', async ({
	page
}) => {
	await gotoApp(page, '/documents');

	const firstRow = page.getByRole('row').filter({ hasText: 'Account statement — June 2026' });
	// The row opener is the "Select row" cell (gok-table selection drives the viewer).
	await firstRow.getByRole('gridcell', { name: 'Select row' }).click();

	const viewer = page.getByRole('dialog', { name: 'Document' });
	await expect(viewer).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Account statement — June 2026' })).toBeVisible();

	// Close, then click the SAME row again — the drawer must re-open (dogfooding #12).
	// The dialog's buttons are slotted into shadow, so select Close at page level.
	await page.getByRole('button', { name: 'Close' }).last().click();
	await expect(viewer).toBeHidden();
	await firstRow.getByRole('gridcell', { name: 'Select row' }).click();
	await expect(page.getByRole('dialog', { name: 'Document' })).toBeVisible();
});

// SVC-Q-02 (S2 data-integrity/state): after signing doc-terms, the e-sign session is
// persisted but the vault's signed flag is not, so on a reload /documents still lists the
// doc as "Awaiting my signature" (status "—") while the sign page shows it as signed.
test.fixme('SVC-Q-02: a signed document persists as signed in the vault across reload', async ({
	page
}) => {
	await page.addInitScript(() => window.localStorage.removeItem('gok-bank-esign-sessions'));

	// Sign doc-terms.
	await gotoApp(page, '/documents/doc-terms/sign');
	const reader = page.getByRole('region', { name: /full text, scroll to the end/ });
	await reader.evaluate((el) => {
		el.scrollTop = el.scrollHeight;
		el.dispatchEvent(new Event('scroll'));
	});
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.locator('gok-checkbox').click();
	await page.getByRole('button', { name: 'Sign document' }).click();
	const dialog = page.locator('gok-dialog').filter({ hasText: 'Sign document' });
	await expect(dialog).toBeVisible();
	await page.getByRole('button', { name: 'Approve with passkey' }).click();
	await dialog.getByRole('button', { name: 'Sign document' }).click();
	await expect(page.getByRole('heading', { name: /I've signed/ })).toBeVisible();

	// Reload the vault — expected once fixed: the doc is no longer awaiting signature.
	await gotoApp(page, '/documents');
	await expect(page.getByRole('link', { name: 'Sign' })).toHaveCount(0);
});
