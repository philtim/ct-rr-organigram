/**
 * Royal-Rangers domain types shared by the Beitragsabrechnung view and its
 * export (ADR-007).
 *
 * The split between `RrParticipant` and `FeeAssignment` is load-bearing:
 * the view renders aggregates and must never put a name on screen, so it is
 * handed `FeeAssignment` records, which carry no person fields at all. Only
 * the export path reads `RrParticipant`. The boundary holds by type
 * signature rather than by care (ADR-011).
 */

/** One active participant of an RR team group, with the fields the export needs. */
export type RrParticipant = {
    personId: number;
    firstName: string;
    lastName: string;
    /** ISO `yyyy-mm-dd`, or null when ChurchTools has none. */
    birthday: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
    /** Team group names the person is an active participant in. */
    teamNames: string[];
    /**
     * Teilstamm group names the person's teams hang under. Normally one; a
     * participant in two teams of different Teilstämme has two, which the
     * export shows rather than picking one.
     */
    stammNames: string[];
};

/** A sibling cluster. Members are RR participants only — siblings outside RR don't count. */
export type Family = {
    key: string;
    personIds: number[];
};

/**
 * A ChurchTools relationship, reduced to what family detection needs.
 * `kind: 'parent'` means `relativeId` is a parent of `personId`.
 */
export type Relationship = {
    personId: number;
    relativeId: number;
    kind: 'parent' | 'sibling';
};

/**
 * Fee rates, configurable so a rate change doesn't need a release.
 * In cents, to keep the arithmetic exact.
 */
export type FeeConfig = {
    firstChildCents: number;
    secondChildCents: number;
};

export const DEFAULT_FEE_CONFIG: FeeConfig = {
    firstChildCents: 8000,
    secondChildCents: 6000,
};

/**
 * `staff` — the participant is a Mitarbeiter and pays nothing on that ground,
 * regardless of sibling position. Note this is the person's *own* MA status;
 * whether their parents are Mitarbeiter is irrelevant.
 */
export type FeeTier = 'child1' | 'child2' | 'child3plus' | 'staff';

/** Deliberately carries no name, birthday or address — see the note above. */
export type FeeAssignment = {
    personId: number;
    familyKey: string;
    tier: FeeTier;
    amountCents: number;
    /**
     * Position among the family's *paying* children, 1-based. Null for staff,
     * who are removed from the count entirely: in a family of three where the
     * eldest is a Mitarbeiter, the next child is the first paying one and owes
     * the full first-child rate.
     */
    payingPosition: number | null;
};
