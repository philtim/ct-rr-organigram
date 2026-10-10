import { describe, expect, it } from 'vitest';
import { loadFailures, rollUpHauptstamm, rollUpTeilstamm, uniqueHeadcount } from './rollup';
import type { Leader, OrgNode } from './types';

function leader(personId: number): Leader {
    return {
        personId,
        roleId: 1,
        fullName: `P${personId}`,
        initials: 'P',
        imageUrl: null,
        roleName: 'Leiter',
        roleSortKey: 0,
        isPillRole: true,
    };
}

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

const failed = (groupId: number) => node(groupId, { error: 'fetch-failed', incomplete: true });
const p = (personId: number) => ({ personId, fullName: `P${personId}` });

describe('uniqueHeadcount', () => {
    it('counts a person once, as a leader, when they lead one group and join another', () => {
        expect(
            uniqueHeadcount([[leader(1)], [leader(1), leader(2)]], [[p(1), p(3)], [p(3)]]),
        ).toEqual({ leaderCount: 2, memberCount: 1 });
    });
});

describe('rollUpTeilstamm', () => {
    it('sums its teams and is complete when every team loaded', () => {
        const teams = [
            node(10, { leaders: [leader(1)], participants: [p(5)], horizontCount: 2 }),
            node(11, { leaders: [leader(2)], participants: [p(5), p(6)], horizontCount: 1 }),
        ];
        const ts = rollUpTeilstamm(node(1), teams);
        expect(ts).toMatchObject({
            leaderCount: 2,
            memberCount: 2,
            horizontCount: 3,
            incomplete: false,
        });
        expect(ts.children).toBe(teams);
    });

    it('is incomplete when a team failed, and still lists the teams that loaded', () => {
        const ts = rollUpTeilstamm(node(1), [node(10, { leaders: [leader(1)] }), failed(11)]);
        expect(ts.incomplete).toBe(true);
        expect(ts.children).toHaveLength(2);
        expect(ts.childrenFailed).toBeUndefined();
    });

    it('is incomplete and has no teams when the list of teams could not be read', () => {
        expect(rollUpTeilstamm(node(1), null)).toMatchObject({
            children: [],
            childrenFailed: true,
            incomplete: true,
        });
    });

    it('keeps its figures when only its own group failed — they come from the teams', () => {
        const ts = rollUpTeilstamm(failed(1), [node(10, { leaders: [leader(1)] })]);
        expect(ts).toMatchObject({ leaderCount: 1, incomplete: false, error: 'fetch-failed' });
    });
});

describe('rollUpHauptstamm', () => {
    const complete = () => [
        rollUpTeilstamm(node(1, { leaders: [leader(9)] }), [
            node(10, { leaders: [leader(1)], participants: [p(5)], horizontCount: 1 }),
        ]),
        rollUpTeilstamm(node(2), [node(20, { participants: [p(5), p(9)], horizontCount: 2 })]),
    ];

    it('unions leaders across all levels and lets leader status win', () => {
        const root = rollUpHauptstamm(node(100, { leaders: [leader(7)] }), complete());
        // Leaders 7, 9, 1. Participants 5 and 9; 9 is a leader, so only 5 remains.
        expect(root).toMatchObject({
            leaderCount: 3,
            memberCount: 1,
            horizontCount: 3,
            incomplete: false,
        });
    });

    it('is incomplete when a whole Teilstamm failed, but keeps the others', () => {
        const teilstaemme = [...complete(), rollUpTeilstamm(failed(3), null)];
        const root = rollUpHauptstamm(node(100), teilstaemme);
        expect(root.incomplete).toBe(true);
        expect(root.children).toHaveLength(3);
    });

    it('is incomplete when a single team somewhere failed', () => {
        const teilstaemme = [rollUpTeilstamm(node(1), [node(10), failed(11)])];
        expect(rollUpHauptstamm(node(100), teilstaemme).incomplete).toBe(true);
    });

    it("is incomplete when a Teilstamm's own group failed — its leaders count here", () => {
        const teilstaemme = [rollUpTeilstamm(failed(1), [node(10)])];
        expect(rollUpHauptstamm(node(100), teilstaemme).incomplete).toBe(true);
    });

    it('is incomplete when the Hauptstamm group itself failed', () => {
        expect(rollUpHauptstamm(failed(100), complete()).incomplete).toBe(true);
    });
});

describe('loadFailures', () => {
    it('names every part that could not be read, top-down', () => {
        const root = rollUpHauptstamm(node(100), [
            rollUpTeilstamm(node(1, { name: 'Nord' }), [node(10), failed(11)]),
            rollUpTeilstamm(failed(2), null),
        ]);
        expect(loadFailures(root)).toEqual([
            { kind: 'team', name: 'G11', teilstamm: 'Nord' },
            { kind: 'teilstamm', name: 'G2' },
            { kind: 'teilstamm-teams', name: 'G2' },
        ]);
    });

    it('is empty for a tree that loaded completely', () => {
        expect(loadFailures(rollUpHauptstamm(node(100), []))).toEqual([]);
    });
});
