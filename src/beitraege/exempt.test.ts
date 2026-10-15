import { describe, expect, it } from 'vitest';
import { buildExemptList } from './exempt';
import type { FeeAssignment, RrParticipant } from './types';

// Synthetic people (ADR-009).
const person = (personId: number, firstName: string, lastName: string): RrParticipant => ({
    personId,
    firstName,
    lastName,
    birthday: null,
    street: null,
    zip: null,
    city: null,
    teamNames: [`Team ${personId}`],
    stammNames: [],
    frontendUrl: `https://example.church.tools/persons/${personId}/`,
});
const assign = (
    personId: number,
    familyKey: string,
    tier: FeeAssignment['tier'],
    amountCents: number,
    payingPosition: number | null = null,
): FeeAssignment => ({ personId, familyKey, tier, amountCents, payingPosition });

const people = [
    person(1, 'Anna', 'Berg'),
    person(2, 'Ben', 'Berg'),
    person(3, 'Carla', 'Berg'),
    person(4, 'Dora', 'Feld'),
    person(5, 'Emil', 'Weg'),
];

describe('buildExemptList', () => {
    it('lists exactly the zero fees, grouped by reason, siblings together', () => {
        const groups = buildExemptList(people, [
            assign(1, 'F001', 'child', 8000, 1),
            assign(2, 'F001', 'child', 6000, 2),
            assign(3, 'F001', 'child', 0, 3),
            assign(4, 'F002', 'juniorLeader', 0),
            assign(5, 'F003', 'staff', 0),
        ]);
        expect(groups.map((g) => [g.reason, g.people.map((p) => p.name)])).toEqual([
            ['juniorLeader', ['Dora Feld']],
            ['staff', ['Emil Weg']],
            ['ladder', ['Carla Berg']],
        ]);
        expect(groups[2].people[0]).toMatchObject({ familyKey: 'F001', familySize: 3 });
    });

    it('leaves out a Mitarbeiter whose own rate is above zero', () => {
        const groups = buildExemptList(people, [assign(5, 'F003', 'staff', 2000)]);
        expect(groups).toEqual([]);
    });
});
