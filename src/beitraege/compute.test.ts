import { describe, expect, it } from 'vitest';
import { computeBeitraege } from './compute';
import type { FeeConfig } from '@/shared/settings';
import type { Relationship, RrParticipant } from './types';

const LADDER: FeeConfig = { childCents: [8000, 6000, 0], staffCents: 0, juniorLeaderCents: 1000 };
const DUE = new Date(Date.UTC(2026, 11, 1));

function person(personId: number, birthday: string, street = 'Weg 1'): RrParticipant {
    return {
        personId,
        firstName: `P${personId}`,
        lastName: 'Test',
        birthday,
        street,
        zip: '70000',
        city: 'Stadt',
        teamNames: ['Team'],
        stammNames: ['Stamm'],
    };
}

const parent = (personId: number, relativeId: number): Relationship => ({
    personId,
    relativeId,
    kind: 'parent',
});

describe('computeBeitraege', () => {
    it('bills siblings down the ladder and keeps a leader out of the count', () => {
        // 1, 2, 3 are siblings through parent 99; 1 leads and is 20.
        const people = [
            person(1, '2006-01-01'),
            person(2, '2014-01-01'),
            person(3, '2016-01-01'),
            person(4, '2015-01-01', 'Anderswo 2'),
        ];
        const figures = computeBeitraege(
            people,
            new Set([1, 50]),
            [parent(1, 99), parent(2, 99), parent(3, 99)],
            LADDER,
            DUE,
        );
        // 2 and 3 pay rungs 1 and 2; 4 is a first child; 1 pays the staff rate.
        expect(figures.totals.totalCents).toBe(8000 + 6000 + 8000);
        expect(figures.totals.exemptStaff).toBe(1);
        expect(figures.families).toHaveLength(2);
        // Leaders include 50, who leads somewhere but takes part nowhere.
        expect(figures.leaders).toBe(2);
        expect(figures.members).toBe(3);
    });

    it('bills a leader who is under 18 at the due date at the Juniorleiter rate', () => {
        // Turns 18 on 2 December 2026 — still a minor on the due date.
        const figures = computeBeitraege([person(1, '2008-12-02')], new Set([1]), [], LADDER, DUE);
        expect(figures.assignments[0]).toMatchObject({ tier: 'juniorLeader', amountCents: 1000 });
    });

    it('bills a leader who is 18 at the due date at the staff rate', () => {
        const figures = computeBeitraege([person(1, '2008-12-01')], new Set([1]), [], LADDER, DUE);
        expect(figures.assignments[0]).toMatchObject({ tier: 'staff', amountCents: 0 });
    });

    it('counts the families the last rung applies to', () => {
        const people = [1, 2, 3].map((id) => person(id, '2015-01-01'));
        const relationships = [parent(1, 99), parent(2, 99), parent(3, 99)];
        expect(
            computeBeitraege(people, new Set(), relationships, LADDER, DUE).totals
                .familiesOnLastRung,
        ).toBe(1);
        const oneRung = { ...LADDER, childCents: [5000] };
        expect(
            computeBeitraege(people, new Set(), relationships, oneRung, DUE).totals
                .familiesOnLastRung,
        ).toBe(0);
    });
});
