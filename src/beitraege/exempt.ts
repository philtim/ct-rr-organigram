import type { FeeAssignment, RrParticipant } from './types';

/** Why somebody pays nothing — the three ways a fee comes out at zero. */
export type ExemptReason = 'juniorLeader' | 'staff' | 'ladder';

export type ExemptPerson = {
    personId: number;
    name: string;
    frontendUrl: string | null;
    /** Team name(s) they take part in, joined. */
    teams: string;
    familyKey: string;
    /** RR children in the family — what puts a child on a free rung. */
    familySize: number;
};

export type ExemptGroup = { reason: ExemptReason; people: ExemptPerson[] };

const ORDER: ExemptReason[] = ['juniorLeader', 'staff', 'ladder'];

/**
 * Everyone whose fee comes out at zero, grouped by why.
 *
 * Read from the assignments, not recomputed: the list must name exactly the
 * people the "beitragsfrei" figure counts. A Mitarbeiter or Juniorleiter rate
 * above zero puts those people among the payers, and they are not listed.
 *
 * Built only when the list is opened, from the snapshot the export uses, and
 * carries a name and family id but no address or birthday (ADR-011).
 */
export function buildExemptList(
    participants: RrParticipant[],
    assignments: FeeAssignment[],
): ExemptGroup[] {
    const byId = new Map(participants.map((p) => [p.personId, p]));
    const familySize = new Map<string, number>();
    for (const a of assignments)
        familySize.set(a.familyKey, (familySize.get(a.familyKey) ?? 0) + 1);

    const groups = new Map<ExemptReason, ExemptPerson[]>();
    for (const a of assignments) {
        if (a.amountCents !== 0) continue;
        const p = byId.get(a.personId);
        if (!p) continue;
        const reason: ExemptReason =
            a.tier === 'juniorLeader' ? 'juniorLeader' : a.tier === 'staff' ? 'staff' : 'ladder';
        const list = groups.get(reason) ?? [];
        list.push({
            personId: p.personId,
            name: `${p.firstName} ${p.lastName}`.trim(),
            frontendUrl: p.frontendUrl ?? null,
            teams: p.teamNames.join(', '),
            familyKey: a.familyKey,
            familySize: familySize.get(a.familyKey) ?? 1,
        });
        groups.set(reason, list);
    }

    const byName = (a: ExemptPerson, b: ExemptPerson) => a.name.localeCompare(b.name, 'de');
    // Free-rung children by family, so siblings stand together.
    const byFamily = (a: ExemptPerson, b: ExemptPerson) =>
        a.familyKey.localeCompare(b.familyKey) || byName(a, b);

    return ORDER.filter((reason) => groups.has(reason)).map((reason) => ({
        reason,
        people: [...(groups.get(reason) ?? [])].sort(reason === 'ladder' ? byFamily : byName),
    }));
}
