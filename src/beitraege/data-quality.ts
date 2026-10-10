import type { Relationship, RrParticipant } from './types';

/**
 * What the figures cannot know, counted so the view can admit it.
 *
 * Family detection runs on two signals (see `families.ts`), and a participant
 * who carries neither is treated as an only child — which means they are
 * billed the full first-child rate even if they have siblings in the Stamm.
 * That is the safe direction for a billing error to point, but it is still an
 * error, and nobody can fix it who cannot see it. The data lives in
 * ChurchTools; the extension only reports.
 */
export type DataQuality = {
    /** No street or no postcode — the address signal cannot match these. */
    missingAddress: number;
    /** No date of birth — affects only the oldest-first ordering within a family. */
    missingBirthday: number;
    /** No parent or sibling link to another participant. */
    withoutRelationship: number;
    /** Participants carrying neither signal: certain to be read as only children. */
    unmatchable: number;
};

/** The same three signals, per person — what the export's review column needs. */
export type ParticipantFlags = {
    noAddress: boolean;
    noBirthday: boolean;
    noRelationship: boolean;
};

/**
 * Per-participant data-quality signals.
 *
 * `summarizeDataQuality` is a count over exactly this map, so the figure in
 * the view and the flag in the export row can never disagree about a person.
 */
export function dataQualityFlags(
    participants: RrParticipant[],
    relationships: Relationship[],
): Map<number, ParticipantFlags> {
    const participantIds = new Set(participants.map((p) => p.personId));

    // Only links that reach another participant count. A sibling who left the
    // Stamm, or a parent who was never in it, says nothing about this family.
    const linked = new Set<number>();
    const byParent = new Map<number, number[]>();
    for (const rel of relationships) {
        if (!participantIds.has(rel.personId)) continue;
        if (rel.kind === 'sibling') {
            if (participantIds.has(rel.relativeId)) {
                linked.add(rel.personId);
                linked.add(rel.relativeId);
            }
            continue;
        }
        const children = byParent.get(rel.relativeId);
        if (children) children.push(rel.personId);
        else byParent.set(rel.relativeId, [rel.personId]);
    }
    for (const children of byParent.values()) {
        if (children.length > 1) for (const id of children) linked.add(id);
    }

    const flags = new Map<number, ParticipantFlags>();
    for (const participant of participants) {
        flags.set(participant.personId, {
            noAddress: !participant.street?.trim() || !participant.zip?.trim(),
            noBirthday: !participant.birthday,
            noRelationship: !linked.has(participant.personId),
        });
    }
    return flags;
}

export function summarizeDataQuality(
    participants: RrParticipant[],
    relationships: Relationship[],
): DataQuality {
    let missingAddress = 0;
    let missingBirthday = 0;
    let withoutRelationship = 0;
    let unmatchable = 0;

    for (const flag of dataQualityFlags(participants, relationships).values()) {
        if (flag.noAddress) missingAddress += 1;
        if (flag.noBirthday) missingBirthday += 1;
        if (flag.noRelationship) withoutRelationship += 1;
        if (flag.noAddress && flag.noRelationship) unmatchable += 1;
    }

    return { missingAddress, missingBirthday, withoutRelationship, unmatchable };
}
