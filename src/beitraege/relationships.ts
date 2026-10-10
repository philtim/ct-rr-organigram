import type { Relationship } from './types';

/** A relationship type as `/person/masterdata` lists it. */
export type RelationshipTypeRow = {
    id?: number;
    /** A built-in type's fixed translation key; free text for a custom one. */
    name?: string;
    nameTranslated?: string;
    degreeNameA?: string;
};

/** One row of `/persons/relationships`. */
export type RelationshipRow = {
    personAId?: number;
    personBId?: number;
    relationshipType?: { id?: number };
};

export type RelationshipTypeIds = { parentChild: number | null; sibling: number | null };

/**
 * Which relationship types mean parent/child and sibling at this installation.
 *
 * The ids differ between installations, so they are looked up rather than
 * written down. ChurchTools' built-in types carry a fixed translation key in
 * `name` — `relationship.parent-child` for parent/child, recon-confirmed on
 * rr-demo — which says what a type *is* whatever its id. A sibling type has
 * no such confirmation: it is absent on rr-demo, and an installation that
 * added one by hand has whatever name its admin typed. Both the built-in key
 * and the German name are accepted for it.
 *
 * A type that is absent yields null, and its edges are simply not there:
 * families then rest on shared parents and on the address signal, and the
 * data-quality panel names everyone without a relationship.
 */
export function resolveRelationshipTypes(types: RelationshipTypeRow[]): RelationshipTypeIds {
    const find = (matches: (t: RelationshipTypeRow) => boolean) =>
        types.find((t) => typeof t.id === 'number' && matches(t))?.id ?? null;
    const isNamed = (t: RelationshipTypeRow, word: string) =>
        [t.name, t.nameTranslated].some((n) => n?.trim().toLocaleLowerCase('de') === word);

    return {
        parentChild: find((t) => t.name === 'relationship.parent-child'),
        sibling: find(
            (t) =>
                /^relationship\.siblings?$/.test(t.name ?? '') ||
                t.degreeNameA === 'relationship.part.sibling' ||
                isNamed(t, 'geschwister'),
        ),
    };
}

/**
 * The relationship rows reduced to the edges that touch a participant.
 *
 * Edge direction (recon-confirmed, and the one thing worth getting right
 * here): for parent/child, `personA` is the **parent** and `personB` the
 * **child**. A sibling link is stated once and recorded from both ends, so
 * neither sibling depends on which side of the row they landed on.
 */
export function participantEdges(
    rows: RelationshipRow[],
    types: RelationshipTypeIds,
    participantIds: ReadonlySet<number>,
): Relationship[] {
    const edges: Relationship[] = [];
    for (const row of rows) {
        const a = row.personAId;
        const b = row.personBId;
        const typeId = row.relationshipType?.id;
        if (typeof a !== 'number' || typeof b !== 'number' || typeId === undefined) continue;

        if (typeId === types.parentChild) {
            if (participantIds.has(b)) edges.push({ personId: b, relativeId: a, kind: 'parent' });
        } else if (typeId === types.sibling) {
            if (participantIds.has(a)) edges.push({ personId: a, relativeId: b, kind: 'sibling' });
            if (participantIds.has(b)) edges.push({ personId: b, relativeId: a, kind: 'sibling' });
        }
    }
    return edges;
}
