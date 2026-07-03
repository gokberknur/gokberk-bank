// V14 · The "indicative / delayed" affordance MODEL (ADR-006 rule 3). Pure: turns a
// figure's provenance + asOf into the label the ONE shared `IndicativeTag` renders. Seed
// provenance → no tag (the seed IS the mock; never double-marked). Text only, never colour.

import type { Provenance } from './types';

export interface IndicativeLabel {
	/** Render the tag iff true (i.e. source is live or delayed, never seed). */
	show: boolean;
	/** The label word(s), e.g. "Indicative" / "Indicative — delayed". */
	text: string;
	/** A human "as of 14:32" detail, or '' when there's no live timestamp. */
	detail: string;
}

/** Format an ISO instant as a quiet "as of HH:MM" (local), or '' when null. */
export function asOfLabel(asOf: string | null): string {
	if (!asOf) return '';
	const d = new Date(asOf);
	if (Number.isNaN(d.getTime())) return '';
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	return `as of ${hh}:${mm}`;
}

/** The label model for a figure. `delayed` (e.g. FX EOD) says so; `live` stays plain
 *  "Indicative" — both non-tradeable, both tagged; `seed` shows nothing. */
export function labelFor(source: Provenance, asOf: string | null): IndicativeLabel {
	if (source === 'seed') return { show: false, text: '', detail: '' };
	return {
		show: true,
		text: source === 'delayed' ? 'Indicative — delayed' : 'Indicative',
		detail: asOfLabel(asOf)
	};
}
