import { describe, expect, it } from 'vitest';
import { summarizeDataQuality } from './data-quality';
import type { Relationship, RrParticipant } from './types';

/** Synthetic throughout (ADR-009) — no real participant data in the repository. */
function participant(personId: number, overrides: Partial<RrParticipant> = {}): RrParticipant {
    return {
        personId,
        firstName: `Vorname${personId}`,
        lastName: 'Beispiel',
        birthday: '2014-05-05',
        street: 'Musterweg 1',
        zip: '72213',
        city: 'Altensteig',
        teamNames: ['Team A'],
        stammNames: ['RR Musterstamm-MA'],
        ...overrides,
    };
}

describe('summarizeDataQuality', () => {
    it('reports nothing missing when every record is complete', () => {
        const people = [participant(1), participant(2)];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
        ];
        expect(summarizeDataQuality(people, rels)).toEqual({
            missingAddress: 0,
            missingBirthday: 0,
            withoutRelationship: 0,
            unmatchable: 0,
        });
    });

    it('counts a missing street and a missing postcode alike', () => {
        const people = [
            participant(1, { street: null }),
            participant(2, { zip: '   ' }),
            participant(3),
        ];
        expect(summarizeDataQuality(people, []).missingAddress).toBe(2);
    });

    it('counts a missing birthday', () => {
        const people = [participant(1, { birthday: null }), participant(2)];
        expect(summarizeDataQuality(people, []).missingBirthday).toBe(1);
    });

    it('ignores a parent link that only one participant shares', () => {
        // An only child genuinely has a parent on file. That is not a data gap,
        // but it is also not a link to another participant.
        const people = [participant(1), participant(2)];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 901, kind: 'parent' },
        ];
        expect(summarizeDataQuality(people, rels).withoutRelationship).toBe(2);
    });

    it('ignores a sibling who is not in the Stamm', () => {
        const people = [participant(1)];
        const rels: Relationship[] = [{ personId: 1, relativeId: 7777, kind: 'sibling' }];
        expect(summarizeDataQuality(people, rels).withoutRelationship).toBe(1);
    });

    it('counts an explicit sibling link on both ends', () => {
        const people = [participant(1), participant(2)];
        const rels: Relationship[] = [{ personId: 1, relativeId: 2, kind: 'sibling' }];
        expect(summarizeDataQuality(people, rels).withoutRelationship).toBe(0);
    });

    it('flags as unmatchable only those carrying neither signal', () => {
        const people = [
            // No address, but a shared parent — the relationship signal still works.
            participant(1, { street: null }),
            participant(2, { street: null }),
            // Address present, no relationship — the address signal still works.
            participant(3),
            // Neither: certain to be read as an only child.
            participant(4, { street: null, zip: null }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
        ];
        const quality = summarizeDataQuality(people, rels);
        expect(quality.missingAddress).toBe(3);
        expect(quality.withoutRelationship).toBe(2);
        expect(quality.unmatchable).toBe(1);
    });
});
