import { describe, expect, it } from 'vitest';
import { assignFees, summarize } from './fee-tiers';
import { DEFAULT_FEE_CONFIG } from './types';
import type { Family, FeeConfig, RrParticipant } from './types';

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
    config: FeeConfig = DEFAULT_FEE_CONFIG,
): Record<number, number> {
    const out: Record<number, number> = {};
    for (const a of assignFees(people, families, new Set(staff), config)) {
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
            DEFAULT_FEE_CONFIG,
        );
        expect(result.find((a) => a.personId === 1)).toMatchObject({
            tier: 'staff',
            payingPosition: null,
            amountCents: 0,
        });
        expect(result.find((a) => a.personId === 2)).toMatchObject({
            tier: 'child1',
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

describe('assignFees — configurable rates', () => {
    it('uses the configured amounts', () => {
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01'), child(3, '2014-01-01')];
        const raised: FeeConfig = { firstChildCents: 9000, secondChildCents: 7000 };
        expect(euros(people, [family('F001', [1, 2, 3])], [], raised)).toEqual({
            1: 90,
            2: 70,
            3: 0,
        });
    });

    it('supports a flat rate for both children', () => {
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01')];
        const flat: FeeConfig = { firstChildCents: 7500, secondChildCents: 7500 };
        expect(euros(people, [family('F001', [1, 2])], [], flat)).toEqual({ 1: 75, 2: 75 });
    });

    it('handles odd amounts without floating-point drift', () => {
        const people = [child(1, '2010-01-01'), child(2, '2012-01-01')];
        const odd: FeeConfig = { firstChildCents: 8333, secondChildCents: 1667 };
        const result = assignFees(people, [family('F001', [1, 2])], new Set(), odd);
        expect(result.reduce((sum, a) => sum + a.amountCents, 0)).toBe(10000);
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
        const assignments = assignFees(people, families, new Set([1]), DEFAULT_FEE_CONFIG);

        expect(summarize(assignments, families)).toEqual({
            participants: 5,
            liable: 3,
            exempt: 2,
            exemptStaff: 1,
            exemptThirdChild: 1,
            firstChildren: 2,
            secondChildren: 1,
            familiesWithThreeOrMore: 1,
            totalCents: 22000,
        });
    });

    it('reports zeroes for an empty list', () => {
        expect(summarize([], [])).toMatchObject({
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
        const assignments = assignFees(people, families, new Set([2, 6]), DEFAULT_FEE_CONFIG);
        const summed = assignments.reduce((sum, a) => sum + a.amountCents, 0);
        expect(summarize(assignments, families).totalCents).toBe(summed);
    });
});
