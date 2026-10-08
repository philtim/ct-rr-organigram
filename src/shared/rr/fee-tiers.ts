import type { Family, FeeAssignment, FeeConfig, RrParticipant } from './types';

/**
 * The fee rules, as confirmed by the Stammleitung:
 *
 *  - 1st child pays the first-child rate, 2nd child the second-child rate,
 *    every further child is exempt.
 *  - A participant who is themselves a Mitarbeiter pays nothing on that
 *    ground. Their parents' MA status is irrelevant and never consulted.
 *  - Mitarbeiter are taken *out of the count*, and the remaining children are
 *    numbered from one. Family of three whose eldest is a Mitarbeiter: the
 *    eldest pays nothing, the second child is the first paying one and owes
 *    the full first-child rate, the third owes the second-child rate. Only a
 *    fourth child would be exempt for being a third.
 *
 * Counting order is oldest first — the natural reading of "1. Kind". Which
 * particular sibling is marked exempt was explicitly declared irrelevant, and
 * the family total is the same in any order, but the order is fixed anyway so
 * the output is reproducible.
 */
export function assignFees(
    participants: RrParticipant[],
    families: Family[],
    staffPersonIds: ReadonlySet<number>,
    config: FeeConfig,
): FeeAssignment[] {
    const byId = new Map(participants.map((p) => [p.personId, p]));
    const assignments: FeeAssignment[] = [];

    for (const family of families) {
        const members = family.personIds
            .map((id) => byId.get(id))
            .filter((p): p is RrParticipant => p !== undefined)
            .sort(compareByAgeDesc);

        let payingPosition = 0;
        for (const member of members) {
            if (staffPersonIds.has(member.personId)) {
                assignments.push({
                    personId: member.personId,
                    familyKey: family.key,
                    tier: 'staff',
                    amountCents: 0,
                    payingPosition: null,
                });
                continue;
            }

            payingPosition += 1;
            const tier =
                payingPosition === 1 ? 'child1' : payingPosition === 2 ? 'child2' : 'child3plus';
            const amountCents =
                payingPosition === 1
                    ? config.firstChildCents
                    : payingPosition === 2
                      ? config.secondChildCents
                      : 0;

            assignments.push({
                personId: member.personId,
                familyKey: family.key,
                tier,
                amountCents,
                payingPosition,
            });
        }
    }

    return assignments;
}

/** Oldest first. A missing birthday sorts last, then by id so ties are stable. */
function compareByAgeDesc(a: RrParticipant, b: RrParticipant): number {
    if (a.birthday && b.birthday) {
        if (a.birthday !== b.birthday) return a.birthday < b.birthday ? -1 : 1;
    } else if (a.birthday) {
        return -1;
    } else if (b.birthday) {
        return 1;
    }
    return a.personId - b.personId;
}

export type FeeTotals = {
    participants: number;
    liable: number;
    exempt: number;
    exemptStaff: number;
    exemptThirdChild: number;
    firstChildren: number;
    secondChildren: number;
    familiesWithThreeOrMore: number;
    totalCents: number;
};

/**
 * What the view renders. Counts only — this is the whole reason the view can
 * exist in the same extension as the organigram without putting person data
 * on screen (ADR-007).
 */
export function summarize(assignments: FeeAssignment[], families: Family[]): FeeTotals {
    let exemptStaff = 0;
    let exemptThirdChild = 0;
    let firstChildren = 0;
    let secondChildren = 0;
    let totalCents = 0;

    for (const a of assignments) {
        totalCents += a.amountCents;
        if (a.tier === 'staff') exemptStaff += 1;
        else if (a.tier === 'child3plus') exemptThirdChild += 1;
        else if (a.tier === 'child1') firstChildren += 1;
        else secondChildren += 1;
    }

    return {
        participants: assignments.length,
        liable: firstChildren + secondChildren,
        exempt: exemptStaff + exemptThirdChild,
        exemptStaff,
        exemptThirdChild,
        firstChildren,
        secondChildren,
        familiesWithThreeOrMore: families.filter((f) => f.personIds.length >= 3).length,
        totalCents,
    };
}
