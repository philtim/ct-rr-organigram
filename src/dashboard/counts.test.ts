import { describe, expect, it } from 'vitest';
import { fieldSeenInTree, hasMemberField, leaderRolesOf, splitMembers } from './counts';
import type { OrgNode } from './types';
import type { LeaderRule } from '@/shared/roles';
import type { Group, GroupMember } from '@/shared/types';

const rule = (extra: number[] = [], excluded: number[] = []): LeaderRule => ({
    extra: new Set(extra),
    excluded: new Set(excluded),
});

// 16 Leiter and 17 Co-Leiter are leadership; 15 Mitarbeiter and 38 Teilnehmer are not.
const GROUP: Group = {
    id: 1,
    name: 'Team',
    roles: [
        { groupTypeRoleId: 16, name: 'Leiter', type: 'leader', sortKey: 1 },
        { groupTypeRoleId: 17, name: 'Co-Leiter', type: 'leader', sortKey: 2 },
        { groupTypeRoleId: 15, name: 'Mitarbeiter', type: 'participant', sortKey: 3 },
        { groupTypeRoleId: 38, name: 'Teilnehmer', type: 'participant', sortKey: 4 },
    ],
};

const member = (personId: number, roleId: number, fields?: unknown): GroupMember => ({
    groupTypeRoleId: roleId,
    person: { domainIdentifier: String(personId), title: `P${personId}` },
    fields,
});

const MEMBERS = [member(1, 16), member(2, 17), member(3, 15), member(4, 38)];
const ids = (people: { personId: number }[]) => people.map((p) => p.personId);

describe('splitMembers', () => {
    it('counts leadership roles and the ticked extras as Mitarbeiter', () => {
        const { leaders, participants } = splitMembers(GROUP, MEMBERS, rule([15]));
        expect(ids(leaders)).toEqual([1, 2, 3]);
        expect(ids(participants)).toEqual([4]);
    });

    it('counts a leadership role the admin took out as a child', () => {
        const { leaders, participants } = splitMembers(GROUP, MEMBERS, rule([], [17]));
        expect(ids(leaders)).toEqual([1]);
        expect(ids(participants)).toEqual([2, 3, 4]);
    });
});

describe('leaderRolesOf', () => {
    it('lists the counted leadership roles as positions, in order', () => {
        expect(leaderRolesOf(GROUP, rule([15])).map((r) => r.id)).toEqual([16, 17]);
        expect(leaderRolesOf(GROUP, rule([], [16])).map((r) => r.id)).toEqual([17]);
    });
});

describe('hasMemberField', () => {
    it('finds the field whether or not it is ticked, ignoring case and spaces', () => {
        const members = [member(1, 38, [{ name: ' Horizont ', value: null }])];
        expect(hasMemberField(members, 'horizont')).toBe(true);
    });

    it('is false for a field no member carries, and for no field configured', () => {
        const members = [member(1, 38, [{ name: 'T-Shirt', value: '2' }]), member(2, 38)];
        expect(hasMemberField(members, 'Horizont')).toBe(false);
        expect(hasMemberField(members, '')).toBe(false);
    });
});

describe('fieldSeenInTree', () => {
    const node = (seen: boolean | undefined, children: OrgNode[] = []): OrgNode => ({
        groupId: 1,
        name: 'x',
        leaders: [],
        leaderRoles: [],
        participants: [],
        leaderCount: 0,
        memberCount: 0,
        horizontCount: 0,
        horizontFieldSeen: seen,
        children,
        incomplete: false,
    });

    it('is true when any group anywhere in the tree carries the field', () => {
        expect(fieldSeenInTree(node(false, [node(false, [node(true)])]))).toBe(true);
    });

    it('is false when no group does', () => {
        expect(fieldSeenInTree(node(undefined, [node(false), node(false)]))).toBe(false);
    });
});
