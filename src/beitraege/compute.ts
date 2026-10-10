import { ageBucket } from '@/shared/dates';
import type { FeeConfig } from '@/shared/settings';
import { summarizeDataQuality } from './data-quality';
import type { DataQuality } from './data-quality';
import { groupFamilies } from './families';
import { assignFees, summarize } from './fee-tiers';
import type { FeeTotals } from './fee-tiers';
import type { Family, FeeAssignment, Relationship, RrParticipant } from './types';

export type BeitraegeFigures = {
    families: Family[];
    assignments: FeeAssignment[];
    totals: FeeTotals;
    quality: DataQuality;
    /**
     * The organigram's two headline counts, from the same data by the same
     * rules, so a reader can hold the tabs side by side and have them agree.
     * `participants = members + staff participants` — the Mitarbeiter the
     * organigram counts as leaders are participants here, exempt rather than
     * absent.
     */
    leaders: number;
    members: number;
};

/**
 * Everything the Beitragsabrechnung shows, from what was loaded. Pure: the
 * composable fetches, this decides.
 *
 * `staffPersonIds` is everybody who leads anywhere in scope. A Juniorleiter
 * is one of them who is under 18 **at the due date** — the date the fee is
 * for, and the date the export's "Alter am Stichtag" column shows. Using
 * today would bill somebody at the Juniorleiter rate beside a column saying
 * they are 18.
 */
export function computeBeitraege(
    participants: RrParticipant[],
    staffPersonIds: ReadonlySet<number>,
    relationships: Relationship[],
    config: FeeConfig,
    dueDate: Date,
): BeitraegeFigures {
    const families = groupFamilies(participants, relationships);

    const juniorLeaderPersonIds = new Set(
        participants
            .filter(
                (p) => staffPersonIds.has(p.personId) && ageBucket(p.birthday, dueDate) === 'minor',
            )
            .map((p) => p.personId),
    );

    const assignments = assignFees(
        participants,
        families,
        staffPersonIds,
        juniorLeaderPersonIds,
        config,
    );

    // Leader status takes precedence over participant status, exactly as the
    // organigram's roll-up resolves it.
    const staffParticipants = participants.filter((p) => staffPersonIds.has(p.personId)).length;

    return {
        families,
        assignments,
        totals: summarize(assignments, families, config.childCents.length),
        quality: summarizeDataQuality(participants, relationships),
        leaders: staffPersonIds.size,
        members: participants.length - staffParticipants,
    };
}
