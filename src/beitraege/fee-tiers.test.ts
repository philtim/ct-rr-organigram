import { describe, expect, it } from 'vitest';
import { assignFees, rungFor, summarize } from './fee-tiers';
import type { FeeConfig } from '@/shared/settings';
import type { Family, RrParticipant } from './types';

/**
 * The ladder these cases use. Not a default from the source — there are none
 * any more — but the shape the authors' own Stamm configured: 80 € / 60 € /
 * free from the third onwards, nothing for staff.
 */
const LADDER: FeeConfig = { childCents: [8000, 6000, 0], staffCents: 0, juniorLeaderCents: 0 };

/** Synthetic people; only ids, birthdays and the staff set matter here. */
function child(personId: number, birthday: string): RrParticipant {
    return {
        personId,
        firstName: `Kind${personId}`,
        lastName: 'Test',
        birthday,
        street: 'Musterweg 1',
        zip: '70000',
        city: 'Musterstadt',
        teamNames: [],
        stammNames: ['RR Musterstamm-MA'],
    };
}

function family(key: string, personIds: number[]): Family {
    return { key, personIds };
}

/** personId → amount in euros, for readable assertions. */
function euros(
    people: RrParticipant[],
    families: Family[],
    staff: number[] = [],
    config: FeeConfig = LADDER,
    juniors: number[] = [],
): Record<number, number> {
    const out: Record<number, number> = {};
    for (const a of assignFees(people, families, new Set(staff), new Set(juniors), config)) {
        out[a.personId] = a.amountCents / 100;
    }
    return out;
}

describe('assignFees — sibling tiers', () => {
    it('charges a single child the first-child rate', () => {
        const people = [child(1, '2014-01-01')];
        expect(euros(people, [family('F001', [1])])).toEqual({ 1: 80 });
    });

    it('charges 80 and 60 for two children', () => {
        const people = [child(1, '2012-01-01'), child(2, '2014-01-01')];
        expect(euros(people, [family('F001', [1, 2])])).toEqual({ 1: 80, 2: 60 });
    });

    it('exempts the third child', () => {
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01'), child(3, '2014-01-01')];
        expect(euros(people, [family('F001', [1, 2, 3])])).toEqual({ 1: 80, 2: 60, 3: 0 });
    });

    it('exempts every child beyond the second', () => {
        const people = [1, 2, 3, 4, 5, 6].map((n) => child(n, `201${n}-01-01`));
        expect(euros(people, [family('F001', [1, 2, 3, 4, 5, 6])])).toEqual({
            1: 80,
            2: 60,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
        });
    });

    it('counts per family, not across the list', () => {
        const people = [
            child(1, '2010-01-01'),
            child(2, '2012-01-01'),
            child(3, '2011-01-01'),
            child(4, '2013-01-01'),
        ];
        const families = [family('F001', [1, 2]), family('F002', [3, 4])];
        expect(euros(people, families)).toEqual({ 1: 80, 2: 60, 3: 80, 4: 60 });
    });

    it('counts oldest first', () => {
        const people = [child(1, '2016-01-01'), child(2, '2008-01-01')];
        // Person 2 is older, so they are the first child despite the lower id.
        expect(euros(people, [family('F001', [1, 2])])).toEqual({ 2: 80, 1: 60 });
    });
});

describe('assignFees — Mitarbeiter', () => {
    it('exempts a participant who is themselves a Mitarbeiter', () => {
        const people = [child(1, '2010-01-01')];
        expect(euros(people, [family('F001', [1])], [1])).toEqual({ 1: 0 });
    });

    it('does not count a Mitarbeiter sibling, so the next child pays full rate', () => {
        // The case spelled out by the Stammleitung: three children, the eldest
        // is a Mitarbeiter → the second child is the first paying one.
        const people = [child(1, '2008-01-01'), child(2, '2012-01-01'), child(3, '2014-01-01')];
        expect(euros(people, [family('F001', [1, 2, 3])], [1])).toEqual({ 1: 0, 2: 80, 3: 60 });
    });

    it('needs a fourth child before anyone is exempt as a third', () => {
        const people = [
            child(1, '2008-01-01'),
            child(2, '2010-01-01'),
            child(3, '2012-01-01'),
            child(4, '2014-01-01'),
        ];
        expect(euros(people, [family('F001', [1, 2, 3, 4])], [1])).toEqual({
            1: 0,
            2: 80,
            3: 60,
            4: 0,
        });
    });

    it('handles two Mitarbeiter siblings and one paying child', () => {
        const people = [child(1, '2009-01-01'), child(2, '2011-01-01'), child(3, '2015-01-01')];
        expect(euros(people, [family('F001', [1, 2, 3])], [1, 2])).toEqual({ 1: 0, 2: 0, 3: 80 });
    });

    it('charges nothing when every child is a Mitarbeiter', () => {
        const people = [child(1, '2008-01-01'), child(2, '2009-01-01')];
        expect(euros(people, [family('F001', [1, 2])], [1, 2])).toEqual({ 1: 0, 2: 0 });
    });

    it('marks a Mitarbeiter with the staff tier and no paying position', () => {
        const people = [child(1, '2008-01-01'), child(2, '2012-01-01')];
        const result = assignFees(
            people,
            [family('F001', [1, 2])],
            new Set([1]),
            new Set(),
            LADDER,
        );
        expect(result.find((a) => a.personId === 1)).toMatchObject({
            tier: 'staff',
            payingPosition: null,
            amountCents: 0,
        });
        expect(result.find((a) => a.personId === 2)).toMatchObject({
            tier: 'child',
            payingPosition: 1,
            amountCents: 8000,
        });
    });

    it('exempts a Mitarbeiter regardless of sibling position', () => {
        // Middle child is the Mitarbeiter: the others still pay 80 and 60.
        const people = [child(1, '2008-01-01'), child(2, '2011-01-01'), child(3, '2014-01-01')];
        expect(euros(people, [family('F001', [1, 2, 3])], [2])).toEqual({ 1: 80, 2: 0, 3: 60 });
    });
});

describe('assignFees — the configured ladder', () => {
    const ladder = (childCents: number[]): FeeConfig => ({
        childCents,
        staffCents: 0,
        juniorLeaderCents: 0,
    });

    it('uses the configured amounts', () => {
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01'), child(3, '2014-01-01')];
        expect(euros(people, [family('F001', [1, 2, 3])], [], ladder([9000, 7000, 0]))).toEqual({
            1: 90,
            2: 70,
            3: 0,
        });
    });

    it('supports a flat rate for every child', () => {
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01'), child(3, '2014-01-01')];
        expect(euros(people, [family('F001', [1, 2, 3])], [], ladder([7500]))).toEqual({
            1: 75,
            2: 75,
            3: 75,
        });
    });

    it('applies the last rung to every further child', () => {
        // Four children, three rungs: the fourth repeats the third.
        const people = [1, 2, 3, 4].map((n) => child(n, `201${n}-01-01`));
        expect(
            euros(people, [family('F001', [1, 2, 3, 4])], [], ladder([8000, 6000, 3000])),
        ).toEqual({ 1: 80, 2: 60, 3: 30, 4: 30 });
    });

    it('charges a longer ladder down to its end', () => {
        const people = [1, 2, 3, 4].map((n) => child(n, `201${n}-01-01`));
        expect(
            euros(people, [family('F001', [1, 2, 3, 4])], [], ladder([8000, 6000, 4000, 0])),
        ).toEqual({ 1: 80, 2: 60, 3: 40, 4: 0 });
    });

    it('handles odd amounts without floating-point drift', () => {
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01')];
        const result = assignFees(
            people,
            [family('F001', [1, 2])],
            new Set(),
            new Set(),
            ladder([8333, 1667]),
        );
        expect(result.reduce((sum, a) => sum + a.amountCents, 0)).toBe(10000);
    });
});

describe('assignFees — Juniorleiter', () => {
    const withRates = (staffCents: number, juniorLeaderCents: number): FeeConfig => ({
        childCents: [8000, 6000, 0],
        staffCents,
        juniorLeaderCents,
    });

    it('charges the Juniorleiter rate, not the staff rate', () => {
        // A Juniorleiter holds a leading role, so they are in the staff set
        // too. If staff were tested first the Juniorleiter rate could never
        // apply to anybody.
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01')];
        expect(euros(people, [family('F001', [1, 2])], [1], withRates(0, 2500), [1])).toEqual({
            1: 25,
            2: 80,
        });
    });

    it('takes them out of the sibling count, like a Mitarbeiter', () => {
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01'), child(3, '2014-01-01')];
        // Eldest is a Juniorleiter → the second child is the first paying one.
        expect(euros(people, [family('F001', [1, 2, 3])], [1], withRates(0, 0), [1])).toEqual({
            1: 0,
            2: 80,
            3: 60,
        });
    });

    it('marks them with their own tier and no paying position', () => {
        const result = assignFees(
            [child(1, '2010-01-01')],
            [family('F001', [1])],
            new Set([1]),
            new Set([1]),
            withRates(0, 1500),
        );
        expect(result[0]).toMatchObject({
            tier: 'juniorLeader',
            payingPosition: null,
            amountCents: 1500,
        });
    });
});

describe('rungFor', () => {
    it('reads the rung at the position', () => {
        expect(rungFor(1, [8000, 6000, 0])).toBe(8000);
        expect(rungFor(2, [8000, 6000, 0])).toBe(6000);
    });

    it('repeats the last rung past the end of the ladder', () => {
        expect(rungFor(7, [8000, 6000, 0])).toBe(0);
        expect(rungFor(7, [8000])).toBe(8000);
    });

    it('charges nothing when no ladder is configured', () => {
        // Unreachable in the app — the view refuses to render an unconfigured
        // Beitragsabrechnung — but a silent crash here would be worse.
        expect(rungFor(1, [])).toBe(0);
    });
});

describe('summarize', () => {
    it('counts tiers, families and the total', () => {
        const people = [
            // F001: 4 children, eldest is staff → 80 + 60 + 0
            child(1, '2008-01-01'),
            child(2, '2010-01-01'),
            child(3, '2012-01-01'),
            child(4, '2014-01-01'),
            // F002: single child → 80
            child(5, '2013-01-01'),
        ];
        const families = [family('F001', [1, 2, 3, 4]), family('F002', [5])];
        const assignments = assignFees(people, families, new Set([1]), new Set(), LADDER);

        expect(summarize(assignments, families, LADDER.childCents.length)).toEqual({
            participants: 5,
            liable: 3,
            exempt: 2,
            exemptStaff: 1,
            exemptJuniorLeader: 0,
            exemptLadder: 1,
            perRung: [2, 1, 1],
            familiesWithThreeOrMore: 1,
            totalCents: 22000,
        });
    });

    it('reports zeroes for an empty list', () => {
        expect(summarize([], [], 3)).toMatchObject({
            participants: 0,
            liable: 0,
            exempt: 0,
            totalCents: 0,
        });
    });

    it('keeps the total equal to the sum of the assignments', () => {
        const people = [1, 2, 3, 4, 5, 6, 7].map((n) => child(n, `200${n}-05-05`));
        const families = [
            family('F001', [1, 2, 3]),
            family('F002', [4, 5]),
            family('F003', [6, 7]),
        ];
        const assignments = assignFees(people, families, new Set([2, 6]), new Set(), LADDER);
        const summed = assignments.reduce((sum, a) => sum + a.amountCents, 0);
        expect(summarize(assignments, families, LADDER.childCents.length).totalCents).toBe(summed);
    });
});
