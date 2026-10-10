import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
    getGroup: vi.fn(),
    getGroupMembers: vi.fn(),
    getChildGroups: vi.fn(),
}));
vi.mock('./dashboard.api', () => ({
    getGroup: api.getGroup,
    getGroupMembers: api.getGroupMembers,
}));
vi.mock('@/shared/groups.api', async (importActual) => ({
    ...(await importActual<typeof import('@/shared/groups.api')>()),
    getChildGroups: api.getChildGroups,
}));

import { loadOrganigram } from './hierarchy';
import { loadFailures } from './rollup';
import { EMPTY_SETTINGS } from '@/shared/settings';
import type { Settings } from '@/shared/settings';

const TEAM_TYPE = 3;
const SETTINGS: Settings = {
    ...EMPTY_SETTINGS,
    gateGroupId: 100,
    teilstammIds: [1, 2],
    teamGroupTypeIds: [TEAM_TYPE],
};

const LEADER_ROLE = 50;
const member = (personId: number, roleId = 0) => ({
    person: { domainIdentifier: String(personId), title: `P${personId}` },
    groupTypeRoleId: roleId,
});

/** Group id → members. A group missing from the map fails to load. */
let membersOf: Map<number, ReturnType<typeof member>[]>;
/** Teilstamm id → children. A Teilstamm missing from the map fails to list them. */
let childrenOf: Map<number, { id: number; title: string; groupTypeId: number | null }[]>;

beforeEach(() => {
    membersOf = new Map([
        [100, [member(1, LEADER_ROLE)]],
        [1, []],
        [2, []],
        [10, [member(2, LEADER_ROLE), member(3)]],
        [11, [member(4)]],
        [20, [member(5)]],
    ]);
    childrenOf = new Map([
        [
            1,
            [
                { id: 10, title: 'Team A', groupTypeId: TEAM_TYPE },
                { id: 11, title: 'Team B', groupTypeId: TEAM_TYPE },
                // Not a team type: must not be loaded or counted.
                { id: 12, title: 'Kasse', groupTypeId: 9 },
            ],
        ],
        [2, [{ id: 20, title: 'Team C', groupTypeId: TEAM_TYPE }]],
    ]);
    api.getGroup.mockReset().mockImplementation(async (id: number) => {
        if (!membersOf.has(id)) throw new Error(`HTTP 500 for ${id}`);
        return {
            id,
            name: `G${id}`,
            roles: [{ groupTypeRoleId: LEADER_ROLE, name: 'Leiter', type: 'leader' }],
        };
    });
    api.getGroupMembers.mockReset().mockImplementation(async (id: number) => {
        if (!membersOf.has(id)) throw new Error(`HTTP 500 for ${id}`);
        return membersOf.get(id);
    });
    api.getChildGroups.mockReset().mockImplementation(async (id: number) => {
        const children = childrenOf.get(id);
        if (!children) throw new Error(`HTTP 500 for children of ${id}`);
        return children;
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('loadOrganigram', () => {
    it('builds the tree from the configured Teilstämme and the team-typed children only', async () => {
        const root = await loadOrganigram(SETTINGS);
        expect(root.children.map((ts) => ts.groupId)).toEqual([1, 2]);
        expect(root.children[0].children.map((t) => t.groupId)).toEqual([10, 11]);
        expect(api.getGroup).not.toHaveBeenCalledWith(12);
        // Leaders 1, 2; participants 3, 4, 5.
        expect(root).toMatchObject({ leaderCount: 2, memberCount: 3, incomplete: false });
        expect(loadFailures(root)).toEqual([]);
    });

    it('reads a Teilstamm listed twice once', async () => {
        const root = await loadOrganigram({ ...SETTINGS, teilstammIds: [1, 1, 2] });
        expect(root.children.map((ts) => ts.groupId)).toEqual([1, 2]);
    });

    it('marks the totals incomplete, never zero-but-complete, when a list of teams fails', async () => {
        childrenOf.delete(2);
        const root = await loadOrganigram(SETTINGS);
        const ts2 = root.children[1];
        expect(ts2).toMatchObject({ childrenFailed: true, incomplete: true, children: [] });
        expect(root.incomplete).toBe(true);
        // The other Teilstamm still shows, with its figures.
        expect(root.children[0]).toMatchObject({ incomplete: false, memberCount: 2 });
        expect(loadFailures(root)).toEqual([{ kind: 'teilstamm-teams', name: 'G2' }]);
    });

    it('names a failed team by its title from the children list, and marks it', async () => {
        membersOf.delete(11);
        const root = await loadOrganigram(SETTINGS);
        const failedTeam = root.children[0].children[1];
        expect(failedTeam).toMatchObject({
            groupId: 11,
            name: 'Team B',
            error: 'fetch-failed',
            incomplete: true,
        });
        expect(root.children[0].incomplete).toBe(true);
        expect(root.incomplete).toBe(true);
        expect(loadFailures(root)).toEqual([{ kind: 'team', name: 'Team B', teilstamm: 'G1' }]);
    });

    it('marks the totals incomplete when the Hauptstamm group itself fails', async () => {
        membersOf.delete(100);
        const root = await loadOrganigram(SETTINGS);
        expect(root).toMatchObject({ error: 'fetch-failed', incomplete: true });
        expect(root.children).toHaveLength(2);
        expect(loadFailures(root)).toEqual([{ kind: 'hauptstamm', name: 'Gruppe 100' }]);
    });

    it('refuses to load without a configured Hauptstamm', async () => {
        await expect(loadOrganigram(EMPTY_SETTINGS)).rejects.toThrow();
        expect(api.getGroup).not.toHaveBeenCalled();
    });
});
