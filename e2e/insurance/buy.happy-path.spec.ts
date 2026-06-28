import { test, expect, gotoApp } from '../support/fixtures';

/**
 * N01 — Buy insurance, the P0 money spine: configure → review → forced-decision
 * confirm (consent + step-up) → success. The load-bearing assertion is
 * disclosed == committed: the premium shown on Review must equal the premium the
 * success receipt says was charged, to the cent.
 *
 * Deep-link with ?product=device so the flow seeds straight into "configure" with
 * the deterministic Device-cover catalog (Plus tier, €0 excess, no add-ons → €7.99/mo).
 */
test.describe('insurance · buy (N01) happy path', () => {
	test('discloses a premium and charges exactly that on the success receipt', async ({ page }) => {
		await gotoApp(page, '/insurance/quote?product=device');

		// Configure step renders with the seeded Device-cover product.
		await expect(page.getByRole('heading', { name: 'Build my cover' })).toBeVisible();

		// Name what's insured (required to continue).
		await page.getByRole('textbox', { name: "What I'm insuring" }).fill('iPhone 16 Pro');

		await page.getByRole('button', { name: 'Continue' }).click();

		// Review step — capture the disclosed premium (the exact "€X/month" ledger value).
		await expect(page.getByRole('heading', { name: 'Review my cover' })).toBeVisible();
		const disclosedPremium = (
			await page
				.getByText(/^€[\d.,]+\/month$/)
				.first()
				.innerText()
		).trim();
		expect(disclosedPremium).toMatch(/^€[\d.,]+\/month$/);

		// Open the forced-decision confirm.
		await page.getByRole('button', { name: 'Pay & sign' }).click();

		// Buy & sign is gated until both consent AND step-up are satisfied.
		const buyBtn = page.getByRole('button', { name: 'Buy & sign' });
		await expect(buyBtn).toBeDisabled();

		// Consent: click the checkbox's label so it toggles regardless of shadow DOM.
		await page.getByText("I've read what's covered and excluded").click();
		await expect(buyBtn).toBeDisabled(); // still needs step-up

		await page.getByRole('button', { name: 'Approve with passkey' }).click();
		await expect(page.getByText('Verified with passkey')).toBeVisible();
		await expect(buyBtn).toBeEnabled();

		await buyBtn.click();

		// Success — the policy is live and the receipt names the charged premium.
		await expect(page.getByRole('heading', { name: /is live/ })).toBeVisible();
		await expect(page.getByText(/POL-DEVICE-/)).toBeVisible();

		// The success receipt's Premium ledger value (same "€X/month" formatting).
		const committedPremium = (
			await page
				.getByText(/^€[\d.,]+\/month$/)
				.first()
				.innerText()
		).trim();

		// THE money-spine invariant: disclosed equals committed, to the cent.
		expect(committedPremium).toBe(disclosedPremium);
	});
});
