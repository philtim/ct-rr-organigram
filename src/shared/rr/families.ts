import type { Family, Relationship, RrParticipant } from './types';

/**
 * Sibling detection from two independent signals, because neither alone is
 * good enough on real ChurchTools data:
 *
 *  1. Relationships — a shared parent, or an explicit Geschwister link.
 *     Survives differing spellings and a sibling who has moved out, but is
 *     only as good as the data entry. On the live instance twelve sibling
 *     pairs had no relationship recorded at all.
 *
 *  2. Same address *and* same surname. Catches those twelve, and the surname
 *     test is what keeps it honest: address alone merges unrelated families
 *     in a shared building — Hauptstr. 67/1 in 72227 houses two of them.
 *
 * Union of both signals. Over-merging costs a family real money, so the
 * surname condition is not optional.
 */
export function groupFamilies(
    participants: RrParticipant[],
    relationships: Relationship[],
): Family[] {
    const ids = new Set(participants.map((p) => p.personId));
    const parent = new Map<number, number>();

    const find = (x: number): number => {
        let root = x;
        while (parent.get(root) !== root) root = parent.get(root) ?? root;
        // Path compression, so repeated lookups stay flat.
        let cur = x;
        while (parent.get(cur) !== root) {
            const next = parent.get(cur) ?? root;
            parent.set(cur, root);
            cur = next;
        }
        return root;
    };
    const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(ra, rb);
    };

    for (const p of participants) parent.set(p.personId, p.personId);

    // Signal 1a: an explicit sibling link, when both ends are participants.
    // Signal 1b: everyone sharing a parent is a sibling.
    const childrenByParent = new Map<number, number[]>();
    for (const rel of relationships) {
        if (!ids.has(rel.personId)) continue;
        if (rel.kind === 'sibling') {
            if (ids.has(rel.relativeId)) union(rel.personId, rel.relativeId);
            continue;
        }
        const siblings = childrenByParent.get(rel.relativeId) ?? [];
        siblings.push(rel.personId);
        childrenByParent.set(rel.relativeId, siblings);
    }
    for (const siblings of childrenByParent.values()) {
        for (let i = 1; i < siblings.length; i++) union(siblings[0], siblings[i]);
    }

    // Signal 2: same normalized address AND same normalized surname.
    const byAddress = new Map<string, number[]>();
    for (const p of participants) {
        const street = normalizeStreet(p.street);
        if (!street) continue; // No address is no evidence — never merge on blanks.
        const key = `${normalizeText(p.zip)}|${street}|${normalizeText(p.lastName)}`;
        const bucket = byAddress.get(key) ?? [];
        bucket.push(p.personId);
        byAddress.set(key, bucket);
    }
    for (const bucket of byAddress.values()) {
        for (let i = 1; i < bucket.length; i++) union(bucket[0], bucket[i]);
    }

    const clusters = new Map<number, number[]>();
    for (const p of participants) {
        const root = find(p.personId);
        const members = clusters.get(root) ?? [];
        members.push(p.personId);
        clusters.set(root, members);
    }

    // Deterministic keys: clusters ordered by their lowest person id, so the
    // same input always yields the same family numbering.
    return [...clusters.values()]
        .map((personIds) => [...personIds].sort((a, b) => a - b))
        .sort((a, b) => a[0] - b[0])
        .map((personIds, index) => ({ key: `F${String(index + 1).padStart(3, '0')}`, personIds }));
}

/** Lowercased, whitespace-collapsed. */
export function normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim().toLocaleLowerCase('de').replace(/\s+/g, ' ');
}

/**
 * Street names differ by spelling far more often than by substance:
 * "Weiler Str. 78" and "Weilerstraße 78" are the same door. Fold the common
 * German variants together; house numbers are left alone, because 12 and 12/1
 * are genuinely different addresses — in the live data they hold two sets of
 * cousins.
 */
export function normalizeStreet(value: string | null | undefined): string {
    const base = normalizeText(value);
    if (!base) return '';
    return (
        base
            // "straße" / "strasse" → "str"
            .replace(/stra(ß|ss)e/g, 'str')
            // Drop the abbreviation dot. Not anchored on a word boundary: in
            // "paulinenstr." the "str" is preceded by a word character, so
            // \bstr would never match and the dot would survive.
            .replace(/str\./g, 'str')
            // "weiler str 78" → "weilerstr 78", so the separately written form
            // folds onto the compound one.
            .replace(/\s+str\b/g, 'str')
    );
}
