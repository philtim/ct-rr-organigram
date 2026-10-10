import { describe, expect, it } from 'vitest';
import { groupFamilies, normalizeStreet } from './families';
import type { Relationship, RrParticipant } from './types';

/**
 * Fixtures are synthetic. The rules under test are structural — who shares a
 * parent, an address, a surname — so invented people exercise them exactly as
 * real ones would, and no participant's name or address belongs in a git
 * repository (ADR-011).
 *
 * The scenarios are not invented, though: each mirrors a case found on the
 * live instance while building the 2026 list.
 */
function person(
    personId: number,
    lastName: string,
    opts: Partial<RrParticipant> = {},
): RrParticipant {
    return {
        personId,
        firstName: `Kind${personId}`,
        lastName,
        birthday: '2014-01-01',
        street: 'Musterweg 1',
        zip: '70000',
        city: 'Musterstadt',
        teamNames: [],
        stammNames: ['RR Musterstamm-MA'],
        ...opts,
    };
}

/** Family keys are an implementation detail; compare membership sets. */
function membership(participants: RrParticipant[], relationships: Relationship[]): number[][] {
    return groupFamilies(participants, relationships)
        .map((f) => [...f.personIds].sort((a, b) => a - b))
        .sort((a, b) => a[0] - b[0]);
}

describe('groupFamilies — relationship signal', () => {
    it('merges children who share a parent', () => {
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Bauer', { street: 'Ahornweg 3' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2]]);
    });

    it('merges on an explicit sibling link', () => {
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Bauer', { street: 'Birkenweg 9' }),
        ];
        expect(membership(people, [{ personId: 1, relativeId: 2, kind: 'sibling' }])).toEqual([
            [1, 2],
        ]);
    });

    it('keeps a sibling who has moved out in the family', () => {
        // Live case: two adult siblings at different addresses, held together
        // only by the relationship record.
        const people = [
            person(1, 'Vogel', { street: 'Johannesstr. 17', zip: '70000' }),
            person(2, 'Vogel', { street: 'Schlossbergstraße 3', zip: '70000' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2]]);
    });

    it('ignores a relationship whose other end is not an RR participant', () => {
        // A sibling outside RR must not create a phantom family member — the
        // count that decides the fee is RR children only.
        const people = [person(1, 'Bauer', { street: 'Ahornweg 3' })];
        expect(membership(people, [{ personId: 1, relativeId: 77, kind: 'sibling' }])).toEqual([
            [1],
        ]);
    });

    it('merges three children sharing one of two parents', () => {
        const people = [
            person(1, 'Krause', { street: 'Lindenweg 4' }),
            person(2, 'Krause', { street: 'Lindenweg 4' }),
            person(3, 'Krause', { street: 'Lindenweg 4' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 1, relativeId: 901, kind: 'parent' },
            { personId: 2, relativeId: 901, kind: 'parent' },
            { personId: 3, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2, 3]]);
    });
});

describe('groupFamilies — address signal', () => {
    it('merges same address and same surname when no relationship is recorded', () => {
        // Twelve sibling pairs on the live instance look exactly like this.
        const people = [
            person(1, 'Roy', { street: 'Haldenstr. 26', zip: '72213' }),
            person(2, 'Roy', { street: 'Haldenstr. 26', zip: '72213' }),
        ];
        expect(membership(people, [])).toEqual([[1, 2]]);
    });

    it('does NOT merge same address with different surnames', () => {
        // Hauptstr. 67/1 in 72227 houses two unrelated families. Merging them
        // would wrongly exempt a child.
        const people = [
            person(1, 'Kurz', { street: 'Markgrafenweg 23', zip: '72213' }),
            person(2, 'Sailer', { street: 'Markgrafenweg 23', zip: '72213' }),
        ];
        expect(membership(people, [])).toEqual([[1], [2]]);
    });

    it('folds German street spelling variants together', () => {
        const people = [
            person(1, 'Dieterle', { street: 'Weiler Str. 78', zip: '72285' }),
            person(2, 'Dieterle', { street: 'Weilerstraße 78', zip: '72285' }),
            person(3, 'Dieterle', { street: 'Weilerstrasse 78', zip: '72285' }),
        ];
        expect(membership(people, [])).toEqual([[1, 2, 3]]);
    });

    it('treats differing house numbers as different addresses', () => {
        // Hanfgartenweg 12 and 12/1 are two cousin families, not one.
        const people = [
            person(1, 'Gauss', { street: 'Hanfgartenweg 12', zip: '72227' }),
            person(2, 'Gauss', { street: 'Hanfgartenweg 12/1', zip: '72227' }),
        ];
        expect(membership(people, [])).toEqual([[1], [2]]);
    });

    it('does not merge on a missing street, even with equal surname and zip', () => {
        const people = [
            person(1, 'Ohne', { street: null, zip: '72213' }),
            person(2, 'Ohne', { street: '', zip: '72213' }),
        ];
        expect(membership(people, [])).toEqual([[1], [2]]);
    });

    it('does not merge same surname at different zips', () => {
        const people = [
            person(1, 'Mueller', { street: 'Klosterweg 16', zip: '72280' }),
            person(2, 'Mueller', { street: 'Klosterweg 16', zip: '72226' }),
        ];
        expect(membership(people, [])).toEqual([[1], [2]]);
    });
});

describe('groupFamilies — combination and determinism', () => {
    it('bridges two address groups through a relationship', () => {
        const people = [
            person(1, 'Henne', { street: 'Paulinenstr. 6' }),
            person(2, 'Henne', { street: 'Paulinenstr. 6' }),
            person(3, 'Henne', { street: 'Weit weg 1', zip: '99999' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 3, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2, 3]]);
    });

    it('assigns stable keys regardless of input order', () => {
        const a = person(5, 'Alpha', { street: 'A-Weg 1' });
        const b = person(2, 'Beta', { street: 'B-Weg 2' });
        const forward = groupFamilies([a, b], []);
        const reversed = groupFamilies([b, a], []);
        expect(forward).toEqual(reversed);
        expect(forward.map((f) => f.key)).toEqual(['F001', 'F002']);
        expect(forward[0].personIds).toEqual([2]);
    });

    it('returns every participant exactly once', () => {
        const people = [
            person(1, 'Eins', { street: 'X 1' }),
            person(2, 'Eins', { street: 'X 1' }),
            person(3, 'Zwei', { street: 'Y 2' }),
            person(4, 'Drei', { street: null }),
        ];
        const families = groupFamilies(people, []);
        const seen = families.flatMap((f) => f.personIds).sort((x, y) => x - y);
        expect(seen).toEqual([1, 2, 3, 4]);
    });
});

describe('normalizeStreet', () => {
    it.each([
        ['Weiler Str. 78', 'Weilerstraße 78'],
        ['Besenfelder Str. 5a', 'Besenfelder Straße 5a'],
        ['Alte Str. 8', 'Alte Straße 8'],
        ['  Paulinenstr.  6 ', 'Paulinenstraße 6'],
    ])('treats %s and %s as the same street', (a, b) => {
        expect(normalizeStreet(a)).toBe(normalizeStreet(b));
    });

    it('keeps genuinely different streets apart', () => {
        expect(normalizeStreet('Hanfgartenweg 12')).not.toBe(normalizeStreet('Hanfgartenweg 12/1'));
        expect(normalizeStreet('Höhenstr. 19')).not.toBe(normalizeStreet('Höhenstr. 22'));
    });

    it('maps blank input to the empty string', () => {
        expect(normalizeStreet(null)).toBe('');
        expect(normalizeStreet('   ')).toBe('');
    });
});
