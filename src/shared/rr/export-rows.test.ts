import { describe, expect, it } from 'vitest';
import { buildExportRows } from './export-rows';
import type { ExportRow } from './export-rows';
import { dataQualityFlags } from './data-quality';
import { assignFees } from './fee-tiers';
import { groupFamilies } from './families';
import { rungFor } from './fee-tiers';
import type { FeeConfig } from '@/shared/settings';

/** The ladder these cases use — the shape the authors' Stamm configured. */
const LADDER: FeeConfig = { childCents: [8000, 6000, 0], staffCents: 0, juniorLeaderCents: 0 };
import type { Relationship, RrParticipant } from './types';

/** Synthetic throughout — no real participant belongs in a repository (ADR-011). */
function person(
    personId: number,
    lastName: string,
    birthday: string | null,
    opts: Partial<RrParticipant> = {},
): RrParticipant {
    return {
        personId,
        firstName: `Kind${personId}`,
        lastName,
        birthday,
        street: 'Musterweg 1',
        zip: '70000',
        city: 'Musterstadt',
        teamNames: ['Team A'],
        stammNames: ['RR Musterstamm-MA'],
        ...opts,
    };
}

const DUE = new Date(Date.UTC(2026, 11, 1));

function build(
    participants: RrParticipant[],
    relationships: Relationship[] = [],
    staff: number[] = [],
): ExportRow[] {
    const families = groupFamilies(participants, relationships);
    const staffIds = new Set(staff);
    const assignments = assignFees(participants, families, staffIds, new Set(), LADDER);
    return buildExportRows(
        participants,
        assignments,
        dataQualityFlags(participants, relationships),
        DUE,
    );
}

describe('buildExportRows — order', () => {
    it('keeps siblings together, oldest first', () => {
        const rows = build([
            person(2, 'Beispiel', '2016-05-05'),
            person(1, 'Beispiel', '2012-01-01'),
            person(3, 'Beispiel', '2014-03-03'),
        ]);

        expect(rows.map((r) => r.birthday)).toEqual(['2012-01-01', '2014-03-03', '2016-05-05']);
        expect(rows.map((r) => r.payingPosition)).toEqual([1, 2, 3]);
        expect(new Set(rows.map((r) => r.familyKey)).size).toBe(1);
    });

    it('orders families by surname, not by family key', () => {
        const rows = build([
            person(1, 'Zeller', '2012-01-01', { street: 'Zweiter Weg 2' }),
            person(2, 'Albrecht', '2013-01-01', { street: 'Erster Weg 1' }),
        ]);

        expect(rows.map((r) => r.lastName)).toEqual(['Albrecht', 'Zeller']);
    });
});

/**
 * The guard that matters most for this feature.
 *
 * The workbook does not carry the computed fee as a number — it recomputes it
 * with a formula that counts the family's non-Mitarbeiter rows *above* each
 * row. So a reordering of the rows would leave the file's own totals
 * disagreeing with the figures the view showed, for the same people. This
 * replays the sheet's arithmetic over the exported row order and insists it
 * lands on exactly what `assignFees` decided.
 */
describe('buildExportRows — the sheet formulas reproduce the computed fees', () => {
    function replaySheet(rows: ExportRow[]): Array<{ position: number | null; cents: number }> {
        const seenPerFamily = new Map<string, number>();
        return rows.map((row) => {
            if (row.isStaff) return { position: null, cents: LADDER.staffCents };
            if (row.isJuniorLeader) {
                return { position: null, cents: LADDER.juniorLeaderCents };
            }
            const position = (seenPerFamily.get(row.familyKey) ?? 0) + 1;
            seenPerFamily.set(row.familyKey, position);
            return { position, cents: rungFor(position, LADDER.childCents) };
        });
    }

    it('agrees row by row on a mixed set of families', () => {
        const participants = [
            // Four siblings, the eldest a Mitarbeiter: the second child becomes
            // the first paying one.
            person(10, 'Jürgens', '2008-01-01'),
            person(11, 'Jürgens', '2010-01-01'),
            person(12, 'Jürgens', '2012-01-01'),
            person(13, 'Jürgens', '2014-01-01'),
            // Two siblings at another address.
            person(20, 'Ohlert', '2011-06-06', { street: 'Anderer Weg 7' }),
            person(21, 'Ohlert', '2013-06-06', { street: 'Anderer Weg 7' }),
            // An only child with no address and no relationship.
            person(30, 'Vogt', '2015-02-02', { street: null, zip: null }),
        ];
        const rows = build(participants, [], [10]);

        const replayed = replaySheet(rows);
        expect(replayed.map((r) => r.position)).toEqual(rows.map((r) => r.payingPosition));
        expect(replayed.map((r) => r.cents)).toEqual(rows.map((r) => r.amountCents));

        const sheetTotal = replayed.reduce((sum, r) => sum + r.cents, 0);
        const computedTotal = rows.reduce((sum, r) => sum + r.amountCents, 0);
        expect(sheetTotal).toBe(computedTotal);
        // 1 Mitarbeiter, then 80 + 60 + 0 | 80 + 60 | 80
        expect(computedTotal).toBe(36000);
    });
});

describe('buildExportRows — fields', () => {
    it('marks a Mitarbeiter as exempt and gives them no paying position', () => {
        const rows = build([person(1, 'Keller', '2010-01-01')], [], [1]);

        expect(rows[0].isStaff).toBe(true);
        expect(rows[0].amountCents).toBe(0);
        expect(rows[0].payingPosition).toBeNull();
    });

    it('states the age at the due date, and leaves it open without a birthday', () => {
        const rows = build([person(1, 'Adler', '2014-12-02'), person(2, 'Bauer', null)]);

        expect(rows[0].ageAtDueDate).toBe(11);
        expect(rows[1].ageAtDueDate).toBeNull();
    });

    it('joins several teams and Teilstämme rather than picking one', () => {
        const rows = build([
            person(1, 'Adler', '2014-01-01', {
                teamNames: ['Team A', 'Team B'],
                stammNames: ['Stamm 1', 'Stamm 2'],
            }),
        ]);

        expect(rows[0].teams).toBe('Team A, Team B');
        expect(rows[0].stamm).toBe('Stamm 1, Stamm 2');
    });

    it('names the consequence when neither family signal is available', () => {
        const rows = build([person(1, 'Vogt', '2015-02-02', { street: null, zip: null })]);

        expect(rows[0].reviewNote).toBe(
            'Als Einzelkind geführt — fehlt in ChurchTools: Adresse, Beziehung',
        );
    });

    it('reports a missing relationship alone without claiming a consequence', () => {
        const rows = build([person(1, 'Vogt', '2015-02-02')]);

        expect(rows[0].reviewNote).toBe('fehlt in ChurchTools: Beziehung');
    });

    it('says nothing when the data is complete', () => {
        const rows = build(
            [person(1, 'Vogt', '2015-02-02'), person(2, 'Vogt', '2017-02-02')],
            [{ personId: 1, relativeId: 2, kind: 'sibling' }],
        );

        expect(rows.map((r) => r.reviewNote)).toEqual(['', '']);
    });
});
