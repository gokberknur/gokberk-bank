import { test, expect, gotoApp } from '../support/fixtures';

/**
 * O03 security center — the step-up gate and the forced-decision confirm.
 *
 * Locks three behaviours that protect the account:
 *  1. Revoking a device is gated by step-up; cancelling leaves NO side effect.
 *  2. A completed revoke removes the device AND is written to /security/activity
 *     (regression guard: this log write is only observable via CLIENT-SIDE nav — a
 *     full reload resets the in-memory store to seed, which previously masked it).
 *  3. "Sign out everywhere" is a forced-decision dialog that, once armed (passkey
 *     approved), cannot be dismissed by Escape.
 *
 * Note: gok-dialog carries role="dialog" on a shadow-DOM node while its action
 * buttons are slotted light-DOM — so the buttons are queried at PAGE level (only one
 * step-up dialog is open at a time, keeping names unique), not scoped under the dialog.
 *
 * Spec: onboarding-security/O03.
 */

function deviceRow(page: import('@playwright/test').Page, name: string) {
	return page.getByRole('listitem').filter({ hasText: name });
}

test('device revoke is step-up gated; cancel leaves no side effect', async ({ page }) => {
	await gotoApp(page, '/security/devices');

	const mac = deviceRow(page, 'MacBook Pro');
	await expect(mac).toBeVisible();
	await mac.getByRole('button', { name: 'Revoke' }).click();

	// Step-up dialog: confirm disabled until verified.
	await expect(page.getByRole('dialog', { name: /Revoke MacBook Pro/i })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Revoke device' })).toBeDisabled();

	// Cancel = no side effect: dialog closes, device still listed.
	await page.getByRole('button', { name: 'Cancel' }).click();
	await expect(page.getByRole('dialog', { name: /Revoke MacBook Pro/i })).toBeHidden();
	await expect(deviceRow(page, 'MacBook Pro')).toBeVisible();
});

test('completed revoke removes the device and writes to the activity log', async ({ page }) => {
	await gotoApp(page, '/security/devices');

	await deviceRow(page, 'MacBook Pro').getByRole('button', { name: 'Revoke' }).click();
	await expect(page.getByRole('dialog', { name: /Revoke MacBook Pro/i })).toBeVisible();
	await page.getByRole('button', { name: 'Approve with passkey' }).click();
	const confirm = page.getByRole('button', { name: 'Revoke device' });
	await expect(confirm).toBeEnabled();
	await confirm.click();

	// Optimistic removal.
	await expect(deviceRow(page, 'MacBook Pro')).toHaveCount(0);

	// CLIENT-SIDE navigation to the log (NOT page.goto — that would reset the store).
	await page
		.getByRole('navigation', { name: 'Security areas' })
		.getByRole('link', { name: 'Activity' })
		.click();
	await expect(page).toHaveURL(/\/security\/activity$/);
	await expect(page.getByRole('row', { name: /Device revoked.*MacBook Pro/i })).toBeVisible();
});

test('"Sign out everywhere" is a forced decision that cannot be Escaped once armed', async ({ page }) => {
	await gotoApp(page, '/security/sessions');

	await page.getByRole('button', { name: 'Sign out everywhere' }).click();
	const dialog = page.getByRole('dialog', { name: /Sign out everywhere/i });
	await expect(dialog).toBeVisible();

	// Arm it via step-up.
	await page.getByRole('button', { name: 'Approve with passkey' }).click();
	const confirm = page.getByRole('button', { name: 'Continue' });
	await expect(confirm).toBeEnabled();

	// Armed forced-decision must NOT dismiss on Escape.
	await page.keyboard.press('Escape');
	await expect(dialog).toBeVisible();
	await expect(confirm).toBeVisible();

	// Leave without signing out.
	await page.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialog).toBeHidden();
});
