import { test, expect, gotoApp } from '../support/fixtures';
import { toMinorUnits } from '../support/money';

/**
 * C03 — Daily spend limit, reward-early ceiling validation.
 *
 * CARD-Q-02 (S2, data-integrity / functional): the physical card's ceiling is
 * €5,000. Entering an over-ceiling amount (€10,000) surfaces NO reward-early
 * error and fires a success toast "Daily limit set to €10,000.00" — but
 * `setDailyLimit` silently clamps the stored value to the €5,000 ceiling. The
 * confirmation (toast) therefore does not match what is actually applied, and
 * the spec's reward-early ceiling validation never blocks the entry.
 *
 * FIXME until the limit field blocks (or honestly discloses) the ceiling:
 *  - an over-ceiling entry shows a reward-early "€5,000.00 or less" style error, and
 *  - the success toast, if any, reflects the clamped value — never the raw input.
 */
test.fixme(
	'CARD-Q-02: over-ceiling daily limit is rejected reward-early, not confirmed at the typed amount',
	async ({ page }) => {
		await gotoApp(page, '/cards/card-physical/settings');

		const ceiling = toMinorUnits('€5,000.00'); // the disclosed card ceiling
		const field = page.getByRole('textbox', { name: /Daily spend limit/ });
		await field.fill('10000'); // €10,000 — double the ceiling

		// A reward-early ceiling error must surface (the spec's requirement).
		await expect(page.getByText(/5,000\.00.*or less|above this card/i)).toBeVisible();

		// And the success toast must never claim the un-applied, over-ceiling amount.
		await expect(page.getByText(/Daily limit set to €10,000\.00/)).toHaveCount(0);
		expect(ceiling).toBe(500000);
	}
);
