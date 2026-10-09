import { ageAt } from './dates';
import type { ParticipantFlags } from './data-quality';
import type { FeeAssignment, RrParticipant } from './types';

/**
 * One line of the export's "Teilnehmer" sheet.
 *
 * This is the only place in the codebase where a participant's name, address
 * and date of birth travel together with a fee — the view is handed
 * `FeeAssignment` records, which carry no person fields at all (ADR-011). The
 * rows exist for the length of a download and are never stored.
 */
export type ExportRow = {
    lastName: string;
    firstName: string;
    /** ISO `yyyy-mm-dd`, or null when ChurchTools has none. */
    birthday: string | null;
    /** Completed years at the due date, or null without a date of birth. */
    ageAtDueDate: number | null;
    zip: string;
    city: string;
    street: string;
    /** Teilstamm group name(s), joined — see `RrParticipant.stammNames`. */
    stamm: string;
    /** Team group name(s), joined. */
    teams: string;
    familyKey: string;
    isStaff: boolean;
    /** Empty unless ChurchTools is missing data that affects the assignment. */
    reviewNote: string;
    /**
     * What this code computed. The sheet recomputes both from formulas over
     * the family column, so a mismatch is visible in the workbook itself
     * rather than only to whoever reads this type.
     */
    payingPosition: number | null;
    amountCents: number;
};

/**
 * Build the export rows in the order the sheet must carry them.
 *
 * **Why the order is load-bearing.** The sheet does not hard-code which child
 * pays what: its "Kind-Nr." column is a running count of the family's
 * non-Mitarbeiter rows *above* a row, so the office can correct a family
 * assignment and watch the fees recompute. That makes row order the thing
 * that decides which sibling is the exempt third child.
 *
 * So the rows keep the order `assignFees` used — family by family, oldest
 * first — and the families are then sorted by surname for a human reader.
 * Sorting the rows any other way would leave the sheet's own arithmetic
 * disagreeing with the figures in the view, for the same total.
 */
export function buildExportRows(
    participants: RrParticipant[],
    assignments: FeeAssignment[],
    flags: ReadonlyMap<number, ParticipantFlags>,
    dueDate: Date,
): ExportRow[] {
    const byId = new Map(participants.map((p) => [p.personId, p]));

    // Group by family, first-seen order preserved, so each family's internal
    // order is exactly the one the fee assignment walked.
    const families = new Map<string, ExportRow[]>();
    for (const assignment of assignments) {
        const participant = byId.get(assignment.personId);
        if (!participant) continue;
        const rows = families.get(assignment.familyKey);
        const row = toRow(participant, assignment, flags.get(assignment.personId), dueDate);
        if (rows) rows.push(row);
        else families.set(assignment.familyKey, [row]);
    }

    return [...families.values()].sort((a, b) => compareFamilies(a[0], b[0])).flat();
}

/** By the first member's surname, then given name, then key — stable and reproducible. */
function compareFamilies(a: ExportRow, b: ExportRow): number {
    const byLast = a.lastName.localeCompare(b.lastName, 'de');
    if (byLast !== 0) return byLast;
    const byFirst = a.firstName.localeCompare(b.firstName, 'de');
    if (byFirst !== 0) return byFirst;
    return a.familyKey.localeCompare(b.familyKey, 'de');
}

function toRow(
    participant: RrParticipant,
    assignment: FeeAssignment,
    flags: ParticipantFlags | undefined,
    dueDate: Date,
): ExportRow {
    return {
        lastName: participant.lastName,
        firstName: participant.firstName,
        birthday: participant.birthday,
        ageAtDueDate: ageAt(participant.birthday, dueDate),
        zip: participant.zip ?? '',
        city: participant.city ?? '',
        street: participant.street ?? '',
        stamm: participant.stammNames.join(', '),
        teams: participant.teamNames.join(', '),
        familyKey: assignment.familyKey,
        isStaff: assignment.tier === 'staff',
        reviewNote: reviewNote(flags),
        payingPosition: assignment.payingPosition,
        amountCents: assignment.amountCents,
    };
}

/**
 * What a reader has to check by hand, in the row where it matters.
 *
 * The view counts these; the export has to name them, because the count tells
 * nobody whose record to open. "Als Einzelkind geführt" is the consequence
 * worth spelling out: with neither signal the person cannot be matched to
 * siblings, so they are billed the full first-child rate — which is the safe
 * direction for the error to point, and still an error.
 */
function reviewNote(flags: ParticipantFlags | undefined): string {
    if (!flags) return '';
    const missing: string[] = [];
    if (flags.noAddress) missing.push('Adresse');
    if (flags.noRelationship) missing.push('Beziehung');
    if (flags.noBirthday) missing.push('Geburtsdatum');
    if (missing.length === 0) return '';
    const prefix = flags.noAddress && flags.noRelationship ? 'Als Einzelkind geführt — ' : '';
    return `${prefix}fehlt in ChurchTools: ${missing.join(', ')}`;
}
