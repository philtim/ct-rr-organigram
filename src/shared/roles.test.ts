import { describe, expect, it } from 'vitest';
import { isCountedLeadershipRole, isLeaderRole, isLeadershipRole, roleIdOf } from './roles';
import type { LeaderRule } from './roles';

/**
 * The role ids are the live instance's; the point of these cases is that all
 * three tabs answer "is this a leader?" identically, and that the answer now
 * comes from configuration rather than from a list of names in the source.
 */

const rule = (extra: number[] = [], excluded: number[] = []): LeaderRule => ({
    extra: new Set(extra),
    excluded: new Set(excluded),
});

/** What the admin ticked: Mitarbeiter, Teamhelfer, Organisator on live. */
const EXTRA = rule([15, 20, 19]);

describe('isLeaderRole', () => {
    it('accepts what ChurchTools itself flags as leadership unless taken out', () => {
        // A role added to the group type later counts immediately instead of
        // silently going missing until somebody notices the figures are low.
        expect(isLeaderRole({ groupTypeRoleId: 16, name: 'Leiter', type: 'leader' }, EXTRA)).toBe(
            true,
        );
        expect(
            isLeaderRole({ groupTypeRoleId: 99, name: 'Brandneu', type: 'leader' }, rule()),
        ).toBe(true);
    });

    it('accepts the deprecated isLeader flag when type is absent', () => {
        expect(isLeaderRole({ groupTypeRoleId: 41, isLeader: true }, rule())).toBe(true);
    });

    it('accepts a participant role the admin ticked', () => {
        expect(
            isLeaderRole({ groupTypeRoleId: 15, name: 'Mitarbeiter', type: 'participant' }, EXTRA),
        ).toBe(true);
    });

    it('rejects the same role when the admin did not tick it', () => {
        expect(
            isLeaderRole({ groupTypeRoleId: 15, name: 'Mitarbeiter', type: 'participant' }, rule()),
        ).toBe(false);
    });

    it('rejects a participant role nobody ticked', () => {
        // The regression this module exists for: the Beitragsabrechnung used
        // to treat everything that was not role 8 as a Mitarbeiter, which
        // would have exempted Coach and Interessent from the fee while the
        // organigram counted them as members.
        expect(
            isLeaderRole({ groupTypeRoleId: 18, name: 'Coach', type: 'participant' }, EXTRA),
        ).toBe(false);
        expect(
            isLeaderRole({ groupTypeRoleId: 8, name: 'Teilnehmer', type: 'participant' }, EXTRA),
        ).toBe(false);
    });

    it('goes by the id, not the name — a renamed role keeps counting', () => {
        expect(
            isLeaderRole(
                { groupTypeRoleId: 15, name: 'Helfende Hand', type: 'participant' },
                EXTRA,
            ),
        ).toBe(true);
    });

    it('rejects a leadership role the admin took out', () => {
        const leiter = { groupTypeRoleId: 16, name: 'Leiter', type: 'leader' };
        expect(isLeaderRole(leiter, rule([], [16]))).toBe(false);
        expect(isLeaderRole({ groupTypeRoleId: 17, type: 'leader' }, rule([], [16]))).toBe(true);
    });

    it('lets the exclusion win over the extras, so one id has one answer', () => {
        expect(isLeaderRole({ groupTypeRoleId: 15, type: 'participant' }, rule([15], [15]))).toBe(
            false,
        );
    });

    it('rejects a role with no id, no name and no flags', () => {
        expect(isLeaderRole({}, EXTRA)).toBe(false);
    });
});

describe('isLeadershipRole', () => {
    it('is narrower than isLeaderRole — only what ChurchTools calls leadership', () => {
        expect(isLeadershipRole({ name: 'Mitarbeiter', type: 'participant' })).toBe(false);
        expect(isLeadershipRole({ name: 'Leiter', type: 'leader' })).toBe(true);
    });
});

describe('isCountedLeadershipRole', () => {
    it('is a leadership role the admin kept — what a card lists as a position', () => {
        expect(isCountedLeadershipRole({ groupTypeRoleId: 16, type: 'leader' }, rule())).toBe(true);
        expect(
            isCountedLeadershipRole({ groupTypeRoleId: 16, type: 'leader' }, rule([], [16])),
        ).toBe(false);
        expect(
            isCountedLeadershipRole({ groupTypeRoleId: 15, type: 'participant' }, rule([15])),
        ).toBe(false);
    });
});

describe('roleIdOf', () => {
    it('reads the id from either shape the API delivers', () => {
        // A group's `roles` include calls it groupTypeRoleId; GET /group/roles
        // calls the same number id.
        expect(roleIdOf({ groupTypeRoleId: 15 })).toBe(15);
        expect(roleIdOf({ id: 15 })).toBe(15);
        expect(roleIdOf({})).toBeNull();
    });
});
