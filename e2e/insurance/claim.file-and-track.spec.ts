import { test, expect, gotoApp } from '../support/fixtures';

/**
 * N03 — File a claim end to end (policy → incident → evidence → review → submit)
 * and land on the tracker with a reference at stage "Submitted". Locks the P1
 * claims happy path plus the duplicate / window gating staying informative (never
 * a hard block). Incident date 2026-06-01 is within the 60-day window of the mock
 * TODAY (2026-06-20), so no outside-window acknowledgement is required.
 */
test.describe('insurance · file a claim (N03)', () => {
	test('files against a policy and reaches the tracker with a reference', async ({ page }) => {
		await gotoApp(page, '/insurance/claims/new');

		// Step 1 · choose the Device-cover policy (its policy number is unique).
		await expect(page.getByRole('heading', { name: 'Choose policy' })).toBeVisible();
		await page.getByText('DEV-118702').click();
		await page.getByRole('button', { name: 'Continue' }).click();

		// Step 2 · incident type + date + description.
		await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible();
		await page.getByText('Damage', { exact: true }).click();
		await page.getByLabel('When did it happen?').fill('2026-06-01');
		await page
			.getByLabel('Tell me what happened')
			.fill('Cracked the screen when I dropped it on the pavement.');
		await page.getByRole('button', { name: 'Continue' }).click();

		// Step 3 · evidence is optional — skip straight through.
		await expect(page.getByRole('heading', { name: 'Add evidence' })).toBeVisible();
		await page.getByRole('button', { name: 'Continue' }).click();

		// Step 4 · review, then submit via the forced-decision dialog.
		await expect(page.getByRole('heading', { name: 'Review & submit' })).toBeVisible();
		// Two controls share the name "Review & submit" (the step pill + the action
		// button); the action button is last in the DOM.
		await page.getByRole('button', { name: 'Review & submit' }).last().click();
		await page.getByRole('button', { name: 'Submit claim' }).click();

		// Tracker — a CLM- reference and the first stage.
		await expect(page).toHaveURL(/\/insurance\/claims\//);
		await expect(page.getByRole('heading', { name: /^CLM-/ })).toBeVisible();
		await expect(page.getByText('Submitted').first()).toBeVisible();
		await expect(page.getByText('1 of 3')).toBeVisible();
	});
});
