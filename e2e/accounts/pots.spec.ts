import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Accounts — vaults / pots (A04).
 *
 * Locks the P1 money path: Add money is an instant optimistic internal transfer
 * (ring + toast update), an over-balance Add is blocked reward-early, and creating
 * a pot succeeds. Money-conservation across navigation is verified manually in the
 * QA pass (it relies on in-session client-side nav); here we lock the in-page behaviour
 * that a silent regression would most likely break.
 *
 * Note: the gok-dialog/gok-drawer exposes role="dialog" but carries no accessible name,
 * so we scope with getByRole('dialog') (unnamed) and rely on the unique field/button names.
 */

test('pots grid shows goal cards with progress rings', async ({ page }) => {
	await gotoApp(page, '/accounts/pots');

	await expect(page.getByRole('heading', { level: 1, name: 'Pots' })).toBeVisible();
	await expect(page.getByRole('link', { name: /Emergency fund/ })).toBeVisible();
	// The ring exposes an accessible progress label (figures, not colour alone).
	await expect(page.getByRole('progressbar', { name: /€4,800.00 of €6,000.00/ })).toBeVisible();
});

test('Add money optimistically updates the ring and fires a success toast', async ({ page }) => {
	await gotoApp(page, '/accounts/pots/pot-emergency');

	// The drawer's fields are slotted (not DOM-nested under [role=dialog]); the field name is
	// unique page-wide, and the in-drawer confirm is the second "Add money" button (.last()).
	await page.getByRole('button', { name: 'Add money' }).click();
	await page.getByRole('textbox', { name: 'Amount to add (EUR)' }).fill('100');
	await page.getByRole('button', { name: 'Add money' }).last().click();

	// €4,800 → €4,900 (80% → 82%) and a no-blame success toast.
	await expect(page.getByRole('progressbar', { name: /€4,900.00 of €6,000.00/ })).toBeVisible();
	await expect(page.getByText('Added €100.00 to Emergency fund')).toBeVisible();
});

test('Add money above the wallet balance is blocked reward-early', async ({ page }) => {
	await gotoApp(page, '/accounts/pots/pot-emergency');

	await page.getByRole('button', { name: 'Add money' }).click();
	await page.getByRole('textbox', { name: 'Amount to add (EUR)' }).fill('99999');

	// Inline no-blame error + the in-drawer confirm stays disabled (no submit-time spring).
	await expect(page.getByText(/Not enough balance/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add money' }).last()).toBeDisabled();
});

test('create-pot validates then creates a pot with a toast', async ({ page }) => {
	await gotoApp(page, '/accounts/pots/new');

	// Disabled until the required fields are valid ("Create pot" is unique on this route).
	await expect(page.getByRole('button', { name: 'Create pot' })).toBeDisabled();

	await page.getByRole('textbox', { name: 'What am I saving for?' }).fill('QA test pot');
	await page.getByRole('textbox', { name: 'Goal (EUR)' }).fill('500');
	await page.getByRole('button', { name: 'Create pot' }).click();

	await expect(page.getByText('Created QA test pot')).toBeVisible();
	await expect(page.getByRole('link', { name: /QA test pot/ })).toBeVisible();
});
