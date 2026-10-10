import { describe, expect, it } from 'vitest';
import {
    findDuplicateLeaders,
    findDuplicateMembers,
    findMixedAssignments,
    findPeopleWithoutTeam,
} from './duplicates';
import { rollUpHauptstamm, rollUpTeilstamm } from './rollup';
import type { Leader, OrgNode } from './types';

function node(groupId: number, over: Partial<OrgNode> = {}): OrgNode {
    return {
        groupId,
        name: `G${groupId}`,
        leaders: [],
        leaderRoles: [],
        participants: [],
        leaderCount: 0,
        memberCount: 0,
        horizontCount: 0,
        children: [],
        incomplete: false,
        ...over,
    };
}

const p = (personId: number) => ({ personId, fullName: `P${personId}` });
const leader = (personId: number, isPillRole = true): Leader => ({
    personId,
    roleId: 1,
    fullName: `P${personId}`,
    initials: 'P',
    imageUrl: null,
    roleName: isPillRole ? 'Leiter' : 'Mitarbeiter',
    roleSortKey: 0,
    isPillRole,
});
const failed = (groupId: number) => node(groupId, { error: 'fetch-failed', incomplete: true });

describe('findPeopleWithoutTeam', () => {
    it('names a Teilstamm member who is in none of its teams', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { participants: [p(1), p(2)] }), [
                node(10, { participants: [p(1)] }),
            ]),
        ]);
        expect(findPeopleWithoutTeam(root).staff.map((e) => e.personId)).toEqual([2]);
    });

    it('accuses nobody when the list of teams could not be read', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { participants: [p(1), p(2)] }), null),
        ]);
        expect(findPeopleWithoutTeam(root)).toEqual({ staff: [], leadership: [] });
    });

    it('accuses nobody when one of the teams could not be read', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { participants: [p(1), p(2)] }), [
                node(10, { participants: [p(1)] }),
                failed(11),
            ]),
        ]);
        expect(findPeopleWithoutTeam(root)).toEqual({ staff: [], leadership: [] });
    });
});

describe('findDuplicateMembers', () => {
    it('lists a participant of two teams, and ignores teams that failed', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1), [
                node(10, { name: 'A', participants: [p(1), p(2)] }),
                node(11, { name: 'B', participants: [p(1)] }),
                failed(12),
            ]),
        ]);
        expect(findDuplicateMembers(root)).toEqual([
            { personId: 1, fullName: 'P1', teamNames: ['A', 'B'] },
        ]);
    });
});

describe('findPeopleWithoutTeam — leaders', () => {
    it('does not name a team leader, and splits the rest by leadership role', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { leaders: [leader(1), leader(2), leader(3, false)] }), [
                node(10, { leaders: [leader(1)] }),
            ]),
        ]);
        expect(findPeopleWithoutTeam(root)).toEqual({
            leadership: [{ personId: 2, fullName: 'P2', teilstammNames: ['G1'] }],
            staff: [{ personId: 3, fullName: 'P3', teilstammNames: ['G1'] }],
        });
    });
});

describe('findDuplicateLeaders', () => {
    it('lists a leader of two teams, and not a participant of two', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1), [
                node(10, { name: 'A', leaders: [leader(1)], participants: [p(2)] }),
                node(11, { name: 'B', leaders: [leader(1)], participants: [p(2)] }),
            ]),
        ]);
        expect(findDuplicateLeaders(root)).toEqual([
            { personId: 1, fullName: 'P1', teamNames: ['A', 'B'] },
        ]);
    });
});

describe('findMixedAssignments', () => {
    it('lists someone who leads one team and takes part in another, and nobody else', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1), [
                node(10, { name: 'A', leaders: [leader(1), leader(3)], participants: [p(2)] }),
                node(11, { name: 'B', leaders: [leader(3)], participants: [p(1), p(2)] }),
            ]),
        ]);
        expect(findMixedAssignments(root)).toEqual([
            { personId: 1, fullName: 'P1', leaderTeams: ['A'], participantTeams: ['B'] },
        ]);
    });
});
