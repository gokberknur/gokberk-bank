import { test, expect, gotoApp } from '../support/fixtures';

/**
 * C02 — Order a card, virtual happy path (P0 issuance spine).
 *
 * gather (type → design) → review → forced-decision confirm → success.
 * A virtual card issues instantly, so the delivery step is skipped and the
 * success panel reads "Ready to use" with an "issued instantly" line.
 *
 * Locks: the wizard completes end to end, exactly one confirm mints the card,
 * and the success copy is honest about instant issuance.
 */
test('order a virtual card issues instantly and lands on the success panel', async ({ page }) => {
	await gotoApp(page, '/cards');

	// Open the order wizard from the wallet's trailing "+ Add a card" hero.
	await page.getByRole('button', { name: 'Add a card' }).click();
	await expect(page.getByRole('heading', { name: 'Order a card' })).toBeVisible();

	// Step 1 — choose Virtual (instant issue, no delivery step).
	await page.getByRole('radio', { name: /Virtual/ }).click();
	await page.getByRole('button', { name: 'Continue' }).click();

	// Step 2 — keep the default design + funding wallet, advance.
	await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();

	// Delivery is skipped for a virtual card → straight to Review.
	await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
	await expect(page.getByText('Issued instantly')).toBeVisible();

	// Review → forced-decision confirm dialog → commit once.
	await page.getByRole('button', { name: 'Review order' }).click();
	const confirm = page.getByRole('button', { name: 'Order card' });
	await expect(confirm).toBeVisible();
	await confirm.click();

	// Success — honest instant-issue copy + a "Ready to use" status tag.
	await expect(page.getByText('Card ordered')).toBeVisible();
	await expect(page.getByText('Ready to use', { exact: true })).toBeVisible();
	await expect(page.getByText(/issued instantly/i)).toBeVisible();
	await expect(page.getByRole('button', { name: 'View my card' })).toBeVisible();
});
