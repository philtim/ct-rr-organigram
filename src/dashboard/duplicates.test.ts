import { describe, expect, it } from 'vitest';
import {
    findDuplicateLeaders,
    findDuplicateMembers,
    findMixedAssignments,
    findPeopleWithoutTeam,
    profileLinks,
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
    it('names a Teilstamm member who is in none of its teams and counts nowhere', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { participants: [p(1), p(2)] }), [
                node(10, { participants: [p(1)] }),
            ]),
        ]);
        const found = findPeopleWithoutTeam(root);
        expect(found.notCounted.map((e) => e.personId)).toEqual([2]);
        expect(found.staff).toEqual([]);
    });

    it('lists as staff without team somebody counted elsewhere in the tree', () => {
        // 2 is a plain member of Teilstamm 1, but leads a team of Teilstamm 2.
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { participants: [p(2)] }), [node(10)]),
            rollUpTeilstamm(node(2), [node(20, { leaders: [leader(2)] })]),
        ]);
        const found = findPeopleWithoutTeam(root);
        expect(found.staff.map((e) => e.personId)).toEqual([2]);
        expect(found.notCounted).toEqual([]);
    });

    it('lists nobody who is a child in a team elsewhere', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { participants: [p(2)] }), [node(10)]),
            rollUpTeilstamm(node(2), [node(20, { participants: [p(2)] })]),
        ]);
        expect(findPeopleWithoutTeam(root)).toEqual({ staff: [], leadership: [], notCounted: [] });
    });

    it('names a Hauptstamm member who counts nowhere, but only over a complete tree', () => {
        const teilstaemme = [rollUpTeilstamm(node(1), [node(10, { participants: [p(1)] })])];
        const root = rollUpHauptstamm(node(100, { participants: [p(1), p(9)] }), teilstaemme);
        expect(findPeopleWithoutTeam(root).notCounted.map((e) => e.personId)).toEqual([9]);

        const partial = rollUpHauptstamm(node(100, { participants: [p(9)] }), [
            rollUpTeilstamm(node(1), [failed(10)]),
        ]);
        expect(findPeopleWithoutTeam(partial).notCounted).toEqual([]);
    });

    it('leaves out members of a Sammelgruppe — they are without a team on purpose', () => {
        const root = rollUpHauptstamm(
            node(100, { participants: [p(7)] }),
            [rollUpTeilstamm(node(1, { participants: [p(8)] }), [node(10)])],
            [node(500, { leaders: [leader(7), leader(8)] })],
        );
        expect(findPeopleWithoutTeam(root)).toEqual({ staff: [], leadership: [], notCounted: [] });
    });

    it('accuses nobody when the list of teams could not be read', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { participants: [p(1), p(2)] }), null),
        ]);
        expect(findPeopleWithoutTeam(root)).toEqual({ staff: [], leadership: [], notCounted: [] });
    });

    it('accuses nobody when one of the teams could not be read', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { participants: [p(1), p(2)] }), [
                node(10, { participants: [p(1)] }),
                failed(11),
            ]),
        ]);
        expect(findPeopleWithoutTeam(root)).toEqual({ staff: [], leadership: [], notCounted: [] });
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
            notCounted: [],
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

describe('profileLinks', () => {
    it('finds a link for anyone anywhere in the tree, Sammelgruppen included', () => {
        const linked = (personId: number) => ({
            ...p(personId),
            frontendUrl: `https://ct.example/persons/${personId}`,
        });
        const root = rollUpHauptstamm(
            node(100),
            [rollUpTeilstamm(node(1), [node(10, { participants: [linked(1), p(2)] })])],
            [
                node(500, {
                    leaders: [{ ...leader(3), frontendUrl: 'https://ct.example/persons/3' }],
                }),
            ],
        );
        const links = profileLinks(root);
        expect(links.get(1)).toBe('https://ct.example/persons/1');
        expect(links.get(3)).toBe('https://ct.example/persons/3');
        expect(links.has(2)).toBe(false);
    });
});
