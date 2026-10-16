import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: client }));

import { loadJahresmeldung } from './jahresmeldung.api';
import { EMPTY_SETTINGS } from '@/shared/settings';
import type { Settings } from '@/shared/settings';

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

const SETTINGS: Settings = {
    ...EMPTY_SETTINGS,
    gateGroupId: 1,
    teilstammIds: [10],
    teamGroupTypeIds: [3],
};

const member = (personId: number, roleId: number) => ({
    person: { domainIdentifier: String(personId), title: `P${personId}` },
    groupTypeRoleId: roleId,
    personFields: { birthday: '2014-01-01', sexId: 1 },
});

/** One page, as `fetchAllPages` reads it with `rawResponse`. */
const page = (rows: unknown[]) => ({ data: { data: rows, meta: { pagination: { lastPage: 1 } } } });

/** Members by group id; a group listed in `failing` answers HTTP 500. */
function serve(members: Record<number, unknown[]>, failing: number[] = []) {
    client.get.mockImplementation(async (url: string) => {
        if (url === '/group/roles') {
            return [
                { id: 5, type: 'leader' },
                { id: 6, type: 'participant' },
            ];
        }
        if (url === '/groups/10') return { name: 'Entdecker' };
        if (url === '/groups/10/children') {
            return [
                { title: 'Team A', domainIdentifier: '11', domainAttributes: { groupTypeId: 3 } },
                { title: 'Team B', domainIdentifier: '12', domainAttributes: { groupTypeId: 3 } },
            ];
        }
        const match = /^\/groups\/(\d+)\/members\?/.exec(url);
        if (match) {
            const id = Number(match[1]);
            if (failing.includes(id)) throw httpError(500);
            return page(members[id] ?? []);
        }
        throw new Error(`unexpected request ${url}`);
    });
}

beforeEach(() => {
    client.get.mockReset();
});

/**
 * The Jahresmeldung goes to the Bund. A team that could not be read must
 * mark its row, so the view blanks the row and every total rather than
 * filing a figure that is quietly too low (`tally.ts` takes it from there).
 */
describe('loadJahresmeldung — a gap is marked, never counted as nobody', () => {
    it('marks nothing when every group was read', async () => {
        serve({ 11: [member(101, 6)], 12: [member(102, 6)] });
        const load = await loadJahresmeldung(SETTINGS);
        expect(load.rows).toEqual([{ teilstammId: 10, label: 'Entdecker', incomplete: false }]);
        expect(load.teamCount).toBe(2);
        expect(load.ohneTeamIncomplete).toBe(false);
    });

    it("marks the Teilstamm's row when one of its teams fails, and does not count that team", async () => {
        serve({ 11: [member(101, 6)], 12: [member(102, 6)] }, [12]);
        const load = await loadJahresmeldung(SETTINGS);
        expect(load.rows[0].incomplete).toBe(true);
        expect(load.teamCount).toBe(1);
        expect(load.people.map((p) => p.personId)).toEqual([101]);
    });

    it("marks the row when the Teilstamm's teams cannot be listed", async () => {
        serve({});
        const answer = client.get.getMockImplementation()!;
        client.get.mockImplementation(async (url: string, ...rest: unknown[]) => {
            if (url === '/groups/10/children') throw httpError(503);
            return answer(url, ...rest);
        });
        const load = await loadJahresmeldung(SETTINGS);
        expect(load.rows[0].incomplete).toBe(true);
        expect(load.teamCount).toBe(0);
    });

    it('marks the "ohne Team" row when the Hauptstamm group fails', async () => {
        serve({ 11: [member(101, 6)] }, [1]);
        const load = await loadJahresmeldung(SETTINGS);
        expect(load.ohneTeamIncomplete).toBe(true);
        expect(load.rows[0].incomplete).toBe(false);
    });
});
