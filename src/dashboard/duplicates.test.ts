import { describe, expect, it } from 'vitest';
import { findDuplicateMembers, findPeopleWithoutTeam } from './duplicates';
import { rollUpHauptstamm, rollUpTeilstamm } from './rollup';
import type { OrgNode } from './types';

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
