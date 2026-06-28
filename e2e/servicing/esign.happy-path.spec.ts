import { test, expect, gotoApp } from '../support/fixtures';

/**
 * E-sign (D02) — the P0 legal-signing spine: review (scroll-to-end gate) → consent →
 * step-up → signed. This locks the gate behaviour (Sign stays disabled until the doc is
 * read AND consent is ticked AND step-up is verified) and the happy-path completion that
 * writes a timestamped signed copy.
 *
 * Determinism: the signing session persists to localStorage (`gok-bank-esign-sessions`),
 * so a leftover session from a prior run would skip the gate and show the signed panel.
 * We clear it before every test via an init script that runs before app code.
 */

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		window.localStorage.removeItem('gok-bank-esign-sessions');
	});
});

test('Sign is gated until scrolled + consented + step-up, then completes', async ({ page }) => {
	await gotoApp(page, '/documents/doc-terms/sign');

	// Review step: Continue is disabled until the document is scrolled to the end.
	const cont = page.getByRole('button', { name: 'Continue' });
	await expect(cont).toBeDisabled();

	// The scroll region is keyboard-focusable (tabindex=0) and End scrolls it to the bottom
	// — proving the gate is satisfiable without a mouse (a D02 a11y requirement).
	const reader = page.getByRole('region', { name: /full text, scroll to the end/ });
	await reader.evaluate((el) => {
		el.scrollTop = el.scrollHeight;
		el.dispatchEvent(new Event('scroll'));
	});
	await expect(cont).toBeEnabled();
	await cont.click();

	// Consent step: Sign is disabled until the consent box is checked.
	const sign = page.getByRole('button', { name: 'Sign document' });
	await expect(sign).toBeDisabled();
	await page.locator('gok-checkbox').click();
	await expect(page.getByRole('checkbox', { name: /legally binding electronic signature/ })).toBeChecked();
	await expect(sign).toBeEnabled();
	await sign.click();

	// Step-up dialog. The gok-dialog's ARIA "dialog" role is in its shadow root while its
	// action buttons are slotted light-DOM children, so we scope to the gok-dialog HOST to
	// reach the confirm (and disambiguate it from the consent step's "Sign document").
	const dialog = page.locator('gok-dialog').filter({ hasText: 'Sign document' });
	await expect(dialog).toBeVisible();
	const confirm = dialog.getByRole('button', { name: 'Sign document' });
	await expect(confirm).toBeDisabled();
	await page.getByRole('button', { name: 'Approve with passkey' }).click();
	await expect(confirm).toBeEnabled();
	await confirm.click();

	// Signed: a timestamped confirmation with signer, date, a signature reference, and a
	// download affordance.
	await expect(page.getByRole('heading', { name: /I've signed/ })).toBeVisible();
	await expect(page.getByText('Gökberk Nur')).toBeVisible();
	await expect(page.getByText(/GOK-SIG-/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Download my signed copy' })).toBeVisible();
});

test('cancelling step-up applies no signature and returns to consent', async ({ page }) => {
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
	await dialog.getByRole('button', { name: 'Cancel' }).click();

	// No signature applied: no signed panel, and we're back on the consent step with the
	// Sign button present (re-clicking would re-prompt step-up).
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('heading', { name: /I've signed/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Sign document' })).toBeVisible();
});
