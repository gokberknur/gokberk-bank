// Statements state (A06) — exposes a wallet's periodic monthly statements (derived
// from the F03 spine) plus any on-demand range statements I generate this session
// (held in memory). Reads touch `revision` so a new transaction reflows the monthly
// buckets. Generating is light + optimistic — it's record-keeping, no money moves.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import {
	monthlyStatements,
	generateStatement,
	statementTransactions
} from './statements';
import type { Statement } from './statements';
import type { Transaction } from '$lib/data';

class StatementsState {
	/** Custom-range statements generated this session, newest first. */
	generated = $state<Statement[]>([]);

	/** Every statement for a wallet — my generated ones first, then the monthly set. */
	forWallet(walletId: string): Statement[] {
		revision.value;
		const mine = this.generated.filter((s) => s.walletId === walletId);
		return [...mine, ...monthlyStatements(walletId)];
	}

	transactions(stmt: Statement): Transaction[] {
		revision.value;
		return statementTransactions(stmt.walletId, stmt.periodStart, stmt.periodEnd);
	}

	/** Validate a range reward-early: both set and start ≤ end. */
	validRange(start: string, end: string): boolean {
		return !!start && !!end && start <= end;
	}

	/** Generate a custom-range statement (optimistic). Returns it, or null if invalid. */
	generate(walletId: string, start: string, end: string): Statement | null {
		if (!this.validRange(start, end)) return null;
		const stmt = generateStatement(walletId, start, end);
		this.generated = [stmt, ...this.generated.filter((s) => s.id !== stmt.id)];
		toast(
			stmt.txnCount > 0 ? 'Statement generated' : 'Generated — no transactions in that period',
			{ status: stmt.txnCount > 0 ? 'success' : 'neutral' }
		);
		return stmt;
	}
}

export const statements = new StatementsState();
export type { Statement } from './statements';
export { periodLabel } from './statements';
