import { test, expect, gotoApp } from '../support/fixtures';

/**
 * Support tickets (S01) — raise a ticket (reward-early validation), land on the detail
 * with an "Open" status, and post a reply that appends to the thread.
 *
 * Also locks SVC-Q-01 as a recorded-but-failing regression: replying to a RESOLVED ticket
 * does not reopen it, despite the on-screen promise that "a reply reopens the conversation".
 */

test('raise a ticket validates reward-early, opens at "Open", and accepts a reply', async ({
	page
}) => {
	await gotoApp(page, '/support');

	// Reward-early: Send is disabled until subject + description are present.
	const send = page.getByRole('button', { name: 'Send to support' });
	await expect(send).toBeDisabled();
	await page.getByRole('textbox', { name: 'Subject' }).fill('Test ticket subject for QA');
	await page
		.getByRole('textbox', { name: 'Describe it' })
		.fill('A detailed description of the issue for QA testing.');
	await expect(send).toBeEnabled();
	await send.click();

	// Detail: routed to the new ticket, status "Open".
	await expect(page).toHaveURL(/\/support\/tickets\/tk-/);
	await expect(page.getByRole('heading', { name: 'Test ticket subject for QA' })).toBeVisible();
	await expect(page.getByText('Open ticket')).toBeVisible();

	// Reply appends to the thread.
	const replyBody = 'Adding a reply to my ticket for QA.';
	await page.getByRole('textbox', { name: 'My reply' }).fill(replyBody);
	await page.getByRole('button', { name: 'Send reply' }).click();
	await expect(page.getByText(replyBody)).toBeVisible();
});

// SVC-Q-01 (S2 functional): the resolved ticket tk-1 promises "a reply reopens the
// conversation", but `addReply` never changes status, so the ticket stays "Resolved"
// after a reply. Recorded as fixme so the green suite stays green; flip to `test` when
// the reply path reopens a resolved ticket.
test.fixme('SVC-Q-01: a reply to a resolved ticket reopens it', async ({ page }) => {
	await gotoApp(page, '/support/tickets/tk-1');
	await expect(page.getByText('Resolved ticket')).toBeVisible();

	await page.getByRole('textbox', { name: 'My reply' }).fill('Reopening — the address is still wrong.');
	await page.getByRole('button', { name: 'Send reply' }).click();

	// Expected once fixed: the ticket leaves the Resolved state.
	await expect(page.getByText('Resolved ticket')).toHaveCount(0);
});
