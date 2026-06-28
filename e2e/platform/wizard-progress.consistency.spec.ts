import { test, expect, gotoApp } from '../support/fixtures';

/**
 * LEND-U-03 / INS-U-02 (consistency): every multi-step apply flow now shows the same
 * "Step k of N" progress signal (the shared WizardProgress, matching the signal the loan-apply
 * and claims flows already render via the Wizard composite). Before this, the loan flow had an
 * interactive rail + progress while the mortgage and credit-line flows used a static numbered
 * list, and the insurance quote showed no progress at all. These guard the unified signal.
 */
test('credit-line apply shows the shared step progress', async ({ page }) => {
	await gotoApp(page, '/lending/credit-line/apply');
	await expect(page.getByText('Step 1 of 3')).toBeVisible();
});

test('mortgage apply shows the shared step progress', async ({ page }) => {
	await gotoApp(page, '/lending/mortgages/apply');
	await expect(page.getByText('Step 1 of 6')).toBeVisible();
});

test('insurance quote shows the shared step progress', async ({ page }) => {
	await gotoApp(page, '/insurance/quote');
	await expect(page.getByText('Step 1 of 3')).toBeVisible();
});
