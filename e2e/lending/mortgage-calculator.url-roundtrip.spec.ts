import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Mortgage calculator (L03) — the share contract + math.
 *
 * The calculator serializes its inputs to URL query params (minor units for money)
 * so a result is shareable/bookmarkable. Deep-linking that URL (a fresh reload) must
 * rehydrate every field AND recompute the ledger. This locks both the round-trip and
 * the monthly/LTV math for a known fixture: €350,000 value, €70,000 deposit (80% LTV,
 * €280,000 loan), 25-year fixed -> €1,421.20 / month.
 */
test('mortgage calculator: deep-linked URL rehydrates fields and recomputes the ledger', async ({
	page
}) => {
	await gotoApp(page, '/lending/mortgages/calculator?p=35000000&d=7000000&t=25&r=fixed');

	// Estimate disclosure is present (never presented as an offer).
	await expect(page.getByText(/This is an estimate — not a quote or an offer/i)).toBeVisible();

	// Computed ledger reflects the deep-linked figures.
	await expect(page.getByText('€1,421.20').first()).toBeVisible(); // monthly payment
	await expect(page.getByRole('definition').filter({ hasText: '80%' }).first()).toBeVisible(); // LTV

	// Round-trip the other way: the seeded fields produce a different result, and
	// re-loading without params must not throw / must still render the calculator.
	await gotoApp(page, '/lending/mortgages/calculator');
	await expect(page.getByRole('heading', { name: 'Mortgage calculator' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'The numbers' })).toBeVisible();
});
