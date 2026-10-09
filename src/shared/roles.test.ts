import { describe, expect, it } from 'vitest';
import { isLeaderRole, isLeadershipRole, roleIdOf } from './roles';

/**
 * The role ids are the live instance's; the point of these cases is that all
 * three tabs answer "is this a leader?" identically, and that the answer now
 * comes from configuration rather than from a list of names in the source.
 */

/** What the admin ticked: Mitarbeiter, Teamhelfer, Organisator on live. */
const EXTRA = new Set([15, 20, 19]);

describe('isLeaderRole', () => {
    it('accepts what ChurchTools itself flags as leadership, configured or not', () => {
        // Always true, so a role added to the group type later counts
        // immediately instead of silently going missing until somebody
        // notices the figures are low.
        expect(isLeaderRole({ groupTypeRoleId: 16, name: 'Leiter', type: 'leader' }, EXTRA)).toBe(
            true,
        );
        expect(
            isLeaderRole({ groupTypeRoleId: 99, name: 'Brandneu', type: 'leader' }, new Set()),
        ).toBe(true);
    });

    it('accepts the deprecated isLeader flag when type is absent', () => {
        expect(isLeaderRole({ groupTypeRoleId: 41, isLeader: true }, new Set())).toBe(true);
    });

    it('accepts a participant role the admin ticked', () => {
        expect(
            isLeaderRole({ groupTypeRoleId: 15, name: 'Mitarbeiter', type: 'participant' }, EXTRA),
        ).toBe(true);
    });

    it('rejects the same role when the admin did not tick it', () => {
        expect(
            isLeaderRole(
                { groupTypeRoleId: 15, name: 'Mitarbeiter', type: 'participant' },
                new Set(),
            ),
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

describe('roleIdOf', () => {
    it('reads the id from either shape the API delivers', () => {
        // A group's `roles` include calls it groupTypeRoleId; GET /group/roles
        // calls the same number id.
        expect(roleIdOf({ groupTypeRoleId: 15 })).toBe(15);
        expect(roleIdOf({ id: 15 })).toBe(15);
        expect(roleIdOf({})).toBeNull();
    });
});
