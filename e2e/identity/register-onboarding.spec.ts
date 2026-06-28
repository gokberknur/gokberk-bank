import { test, expect } from '../support/fixtures';

/**
 * O01/O02 — register validates early and routes into onboarding; the onboarding
 * age gate blocks an under-18 applicant. /register and /onboarding live OUTSIDE the
 * (app) shell, so drive them directly.
 *
 * Spec: onboarding-security/O01, O02.
 */

test('register rejects a weak / mismatched password inline, then routes to onboarding', async ({ page }) => {
	await page.goto('/register');

	await page.getByRole('textbox', { name: 'My email' }).fill('newuser@example.com');
	await page.getByRole('textbox', { name: 'My password', exact: true }).fill('short');
	await page.getByRole('textbox', { name: 'Confirm my password' }).fill('different');
	await page.getByRole('button', { name: 'Create account' }).click();

	// Reward-early, no-blame: stays on /register with field-level guidance.
	await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
	await expect(page.getByText(/don.t match/i)).toBeVisible();
	await expect(page).toHaveURL(/\/register$/);

	// Fix it → routes into onboarding.
	await page.getByRole('textbox', { name: 'My password', exact: true }).fill('validpass123');
	await page.getByRole('textbox', { name: 'Confirm my password' }).fill('validpass123');
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page).toHaveURL(/\/onboarding$/);
});

test('onboarding step 1 blocks an under-18 date of birth', async ({ page }) => {
	await page.goto('/onboarding');

	await expect(page.getByRole('heading', { name: 'About me' })).toBeVisible();
	await page.getByRole('textbox', { name: 'My full name' }).fill('Test User');
	await page.getByRole('textbox', { name: 'My date of birth' }).fill('2015-01-01');
	await page.getByRole('button', { name: 'Continue' }).click();

	await expect(page.getByText(/18 or older/i)).toBeVisible();
	// Did not advance past step 1.
	await expect(page.getByText(/Step 1 of 6/i)).toBeVisible();
});
