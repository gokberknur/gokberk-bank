import { test, expect, gotoApp } from '../support/fixtures';

/**
 * C01 — Reveal the card number (sensitive-data reveal gated by step-up).
 *
 * The masked PAN must never show inline; "Show card number" opens a step-up
 * dialog ("Approve with passkey") and only on approval does the full PAN /
 * expiry / CVV appear under an auto-hide countdown.
 */
test('card number is masked until the step-up is approved', async ({ page }) => {
	await gotoApp(page, '/cards/card-physical');

	// At rest the PAN is masked; the real number must not be in the DOM.
	await expect(page.getByText('•••• •••• •••• 4291').first()).toBeVisible();
	await expect(page.getByText('4291 5500 7820 4291')).toHaveCount(0);

	// Open the reveal — it must land on the verify (step-up) phase, not the PAN.
	await page.getByRole('button', { name: 'Show card number' }).first().click();
	await expect(page.getByRole('button', { name: 'Approve with passkey' })).toBeVisible();
	await expect(page.getByText('4291 5500 7820 4291')).toHaveCount(0);

	// Approve → the full PAN, expiry and CVV reveal.
	await page.getByRole('button', { name: 'Approve with passkey' }).click();
	await expect(page.getByText('4291 5500 7820 4291')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
});

/**
 * CARD-Q-01 (S2, ui-visual) — the three "Copy" buttons in the reveal dialog use
 * an invalid gok-button variant="ghost", which silently falls back to `primary`
 * (dogfooding #18), painting three solid-green accent buttons in one sensitive
 * context. The brand rule is one earned accent per context.
 *
 * FIXME until RevealDialog.svelte stops using the invalid `ghost` variant
 * (e.g. `secondary`). The assertion is deterministic: no ghost-variant buttons.
 */
test.fixme('CARD-Q-01: reveal dialog Copy buttons must not use the invalid ghost variant', async ({
	page
}) => {
	await gotoApp(page, '/cards/card-physical');
	await page.getByRole('button', { name: 'Show card number' }).first().click();
	await page.getByRole('button', { name: 'Approve with passkey' }).click();
	await expect(page.getByText('4291 5500 7820 4291')).toBeVisible();

	// `ghost` is not a valid gok-button variant; it renders as a second+ primary.
	await expect(page.locator('gok-dialog gok-button[variant="ghost"]')).toHaveCount(0);
});
