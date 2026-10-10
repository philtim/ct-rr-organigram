import { describe, expect, it } from 'vitest';
import { participantEdges, resolveRelationshipTypes } from './relationships';

describe('resolveRelationshipTypes', () => {
    it('finds parent/child by its built-in key, whatever its id', () => {
        // The rr-demo list: no sibling type at all.
        const types = [
            { id: 7, name: 'relationship.parent-child', nameTranslated: 'Elternteil/Kind' },
            { id: 2, name: 'relationship.couple', nameTranslated: 'Ehepaar' },
            { id: 5, name: 'noduplicate.name', nameTranslated: 'Keine Dublette' },
        ];
        expect(resolveRelationshipTypes(types)).toEqual({ parentChild: 7, sibling: null });
    });

    it('finds a sibling type by built-in key or by its German name', () => {
        expect(resolveRelationshipTypes([{ id: 3, name: 'relationship.siblings' }]).sibling).toBe(
            3,
        );
        expect(
            resolveRelationshipTypes([{ id: 4, degreeNameA: 'relationship.part.sibling' }]).sibling,
        ).toBe(4);
        expect(resolveRelationshipTypes([{ id: 9, name: ' Geschwister ' }]).sibling).toBe(9);
    });

    it('finds a sibling type by its translated name, and skips a row without an id', () => {
        expect(
            resolveRelationshipTypes([
                { name: 'relationship.parent-child' },
                { id: 7, name: 'relationship.parent-child' },
                { id: 8, name: 'custom.x', nameTranslated: 'Geschwister' },
            ]),
        ).toEqual({ parentChild: 7, sibling: 8 });
    });

    it('does not mistake a type named in passing for one of them', () => {
        expect(
            resolveRelationshipTypes([
                { id: 1, name: 'Elternteil/Kind (Pflege)' },
                { id: 2, name: 'Geschwisterkind-Pate' },
                { id: 3, name: 'relationship.siblings-in-law' },
            ]),
        ).toEqual({ parentChild: null, sibling: null });
    });
});

describe('participantEdges', () => {
    const types = { parentChild: 7, sibling: 3 };
    const participants = new Set([10, 11]);

    it('reads parent/child as A = parent, B = child', () => {
        expect(
            participantEdges(
                [{ personAId: 99, personBId: 10, relationshipType: { id: 7 } }],
                types,
                participants,
            ),
        ).toEqual([{ personId: 10, relativeId: 99, kind: 'parent' }]);
    });

    it('records a sibling link from both ends', () => {
        expect(
            participantEdges(
                [{ personAId: 10, personBId: 11, relationshipType: { id: 3 } }],
                types,
                participants,
            ),
        ).toEqual([
            { personId: 10, relativeId: 11, kind: 'sibling' },
            { personId: 11, relativeId: 10, kind: 'sibling' },
        ]);
    });

    it('drops other types, edges not touching a participant, and incomplete rows', () => {
        expect(
            participantEdges(
                [
                    { personAId: 10, personBId: 11, relationshipType: { id: 2 } },
                    { personAId: 50, personBId: 51, relationshipType: { id: 7 } },
                    { personAId: 10, relationshipType: { id: 3 } },
                    { personAId: 99, personBId: 10 },
                ],
                types,
                participants,
            ),
        ).toEqual([]);
    });

    it('reads nothing as a type the installation does not have', () => {
        expect(
            participantEdges(
                [{ personAId: 10, personBId: 11, relationshipType: { id: 3 } }],
                { parentChild: 7, sibling: null },
                participants,
            ),
        ).toEqual([]);
    });
});
