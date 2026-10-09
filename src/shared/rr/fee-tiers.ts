import type { FeeConfig } from '@/shared/settings';
import type { Family, FeeAssignment, RrParticipant } from './types';

/**
 * The fee rules.
 *
 *  - Children pay by sibling position, oldest first. The ladder comes from
 *    configuration and **its last rung applies to every further child**, so
 *    "free from the third onwards" is the ladder `[x, y, 0]` and a family of
 *    six needs no special case.
 *  - A participant who is themselves a Mitarbeiter, or a Juniorleiter — a
 *    leader under 18 — pays their own configured rate instead, zero at most
 *    Stämme. This is the person's *own* status; whether their parents are
 *    Mitarbeiter is irrelevant and never consulted.
 *  - Both are taken *out of the count*, and the remaining children are
 *    numbered from one. Family of three whose eldest is a Mitarbeiter: the
 *    eldest pays the staff rate, the second child is the first paying one and
 *    owes the full first rung, the third owes the second rung.
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
    juniorLeaderPersonIds: ReadonlySet<number>,
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
            // Juniorleiter first, and the order is load-bearing: a
            // Juniorleiter holds a leading role, so they are in
            // `staffPersonIds` too. Testing staff first would mean the
            // Juniorleiter rate could never apply to anybody.
            if (juniorLeaderPersonIds.has(member.personId)) {
                assignments.push({
                    personId: member.personId,
                    familyKey: family.key,
                    tier: 'juniorLeader',
                    amountCents: config.juniorLeaderCents,
                    payingPosition: null,
                });
                continue;
            }
            if (staffPersonIds.has(member.personId)) {
                assignments.push({
                    personId: member.personId,
                    familyKey: family.key,
                    tier: 'staff',
                    amountCents: config.staffCents,
                    payingPosition: null,
                });
                continue;
            }

            payingPosition += 1;
            assignments.push({
                personId: member.personId,
                familyKey: family.key,
                tier: 'child',
                amountCents: rungFor(payingPosition, config.childCents),
                payingPosition,
            });
        }
    }

    return assignments;
}

/**
 * The rate for a sibling position. Positions beyond the ladder repeat its last
 * rung, which is what makes "ab dem dritten frei" a three-entry list rather
 * than a rule of its own. An empty ladder means the Beitragsabrechnung is
 * unconfigured; the view refuses to render before it gets here.
 */
export function rungFor(position: number, childCents: number[]): number {
    if (childCents.length === 0) return 0;
    return childCents[Math.min(position, childCents.length) - 1];
}

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
    exemptJuniorLeader: number;
    /** Children whose rung on the ladder happens to be zero. */
    exemptLadder: number;
    /** Paying children per rung, index 0 = first child. Trails the ladder's length. */
    perRung: number[];
    familiesWithThreeOrMore: number;
    totalCents: number;
};

/**
 * What the view renders. Counts only — this is the whole reason the view can
 * exist in the same extension as the organigram without putting person data
 * on screen (ADR-007).
 */
export function summarize(
    assignments: FeeAssignment[],
    families: Family[],
    rungCount: number,
): FeeTotals {
    let exemptStaff = 0;
    let exemptJuniorLeader = 0;
    let exemptLadder = 0;
    let liable = 0;
    let totalCents = 0;
    const perRung = new Array<number>(Math.max(rungCount, 0)).fill(0);

    for (const a of assignments) {
        totalCents += a.amountCents;

        if (a.tier === 'staff') {
            if (a.amountCents === 0) exemptStaff += 1;
            else liable += 1;
            continue;
        }
        if (a.tier === 'juniorLeader') {
            if (a.amountCents === 0) exemptJuniorLeader += 1;
            else liable += 1;
            continue;
        }

        if (a.payingPosition !== null && perRung.length > 0) {
            perRung[Math.min(a.payingPosition, perRung.length) - 1] += 1;
        }
        if (a.amountCents === 0) exemptLadder += 1;
        else liable += 1;
    }

    return {
        participants: assignments.length,
        liable,
        exempt: assignments.length - liable,
        exemptStaff,
        exemptJuniorLeader,
        exemptLadder,
        perRung,
        familiesWithThreeOrMore: families.filter((f) => f.personIds.length >= 3).length,
        totalCents,
    };
}
