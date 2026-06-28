import { test, expect } from '../support/fixtures';

/**
 * P0/P1 auth spine: email + password → 2FA (OTP) → /home.
 *
 * /login lives OUTSIDE the (app) shell, so gotoApp (which waits on main#main) does
 * not apply — drive the full-page auth route directly. The demo OTP is the fixed
 * deterministic code 424242 (printed on-screen in the mock).
 *
 * Locks: the login happy path completes and reaches /home; a wrong code is rejected
 * no-blame without leaving the 2FA step. Spec: onboarding-security/O02.
 */

const OTP = '424242';

async function fillOtp(page: import('@playwright/test').Page, code: string) {
	for (let i = 0; i < code.length; i++) {
		await page.getByRole('textbox', { name: `Digit ${i + 1} of 6` }).fill(code[i]);
	}
}

test('login → 2FA via OTP reaches /home', async ({ page }) => {
	await page.goto('/login');

	// Email is prefilled in the demo; set the password and submit.
	await page.getByRole('textbox', { name: 'My password' }).fill('password123');
	await page.getByRole('button', { name: 'Sign in' }).click();

	// 2FA overlay.
	await expect(page.getByRole('heading', { name: "Confirm it's me" })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Use my passkey' })).toBeVisible();

	await fillOtp(page, OTP);
	await page.getByRole('button', { name: 'Verify' }).click();

	await expect(page).toHaveURL(/\/home$/);
	await expect(page.locator('main#main')).toBeVisible();
});

test('wrong OTP is rejected no-blame and stays on the 2FA step', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('textbox', { name: 'My password' }).fill('password123');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('heading', { name: "Confirm it's me" })).toBeVisible();

	await fillOtp(page, '111111');
	await page.getByRole('button', { name: 'Verify' }).click();

	// No-blame error, no navigation off the 2FA step.
	await expect(page.getByText(/didn.t match/i)).toBeVisible();
	await expect(page).toHaveURL(/\/login/);
});

// IDN-Q-01: the 2FA overlay exposes no resend-code control / cooldown, which O02
// requires ("OTP resend cooldown … with resend cooldown"). Documented; un-skip once
// a resend affordance ships.
test.fixme('IDN-Q-01: 2FA offers a resend-code control with cooldown', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('textbox', { name: 'My password' }).fill('password123');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('heading', { name: "Confirm it's me" })).toBeVisible();
	await expect(page.getByRole('button', { name: /resend|send a new code/i })).toBeVisible();
});
