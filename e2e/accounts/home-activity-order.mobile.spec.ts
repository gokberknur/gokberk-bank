import { test, expect, gotoApp } from '../support/fixtures';

/**
 * ACC-U-01 (mobile order): Recent Activity used to be dead-last on mobile (~2663px down), after
 * net worth + wallets + quick actions + spend, because the layout wrapped the main sections and
 * the activity rail separately. The dashboard is now flattened, so on a single-column phone
 * layout activity sits right after balances — above Quick actions. (On desktop it's the sticky
 * right rail; this order check is mobile-only.) Runs only on the mobile (WebKit) project.
 */
test('ACC-U-01: recent activity sits above quick actions on mobile', async ({ page }) => {
	await gotoApp(page, '/home');
	const activity = page.getByRole('heading', { name: 'Activity', exact: true });
	const quick = page.getByRole('heading', { name: 'Start something' });
	const aBox = await activity.boundingBox();
	const qBox = await quick.boundingBox();
	expect(aBox).not.toBeNull();
	expect(qBox).not.toBeNull();
	expect(aBox!.y).toBeLessThan(qBox!.y);
});
