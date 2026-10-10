import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: client }));

import {
    fetchActiveMembers,
    getChildGroups,
    personFieldsOf,
    personIdOf,
    teamsAmong,
} from './groups.api';

beforeEach(() => client.get.mockReset());

describe('getChildGroups', () => {
    it('normalises the rows and drops those without a usable id', async () => {
        client.get.mockResolvedValueOnce([
            { title: 'Team A', domainIdentifier: '11', domainAttributes: { groupTypeId: 3 } },
            { title: 'Odd', domainIdentifier: '12' },
            { title: 'Broken', domainIdentifier: 'x' },
        ]);
        await expect(getChildGroups(1)).resolves.toEqual([
            { id: 11, title: 'Team A', groupTypeId: 3 },
            { id: 12, title: 'Odd', groupTypeId: null },
        ]);
        expect(client.get).toHaveBeenCalledWith('/groups/1/children');
    });
});

describe('teamsAmong', () => {
    it('keeps only the configured types, and never a type-less row', () => {
        const children = [
            { id: 1, title: 'a', groupTypeId: 3 },
            { id: 2, title: 'b', groupTypeId: 4 },
            { id: 3, title: 'c', groupTypeId: null },
        ];
        expect(teamsAmong(children, [3]).map((c) => c.id)).toEqual([1]);
    });
});

describe('fetchActiveMembers', () => {
    it('asks for active members only, with the requested person fields', async () => {
        client.get.mockResolvedValueOnce([]);
        await fetchActiveMembers(7, ['birthday', 'sexId']);
        const url = decodeURIComponent(client.get.mock.calls[0][0] as string);
        expect(url).toContain('/groups/7/members?');
        expect(url).toContain('group_member_statuses[]=active');
        expect(url).toContain('personFields[]=birthday&personFields[]=sexId');
    });
});

describe('personIdOf', () => {
    it('reads the id from person.domainIdentifier', () => {
        expect(personIdOf({ person: { domainIdentifier: '42' } })).toBe(42);
    });

    it('returns null rather than 0 when there is none', () => {
        for (const member of [{}, { person: {} }, { person: { domainIdentifier: '' } }]) {
            expect(personIdOf(member)).toBeNull();
        }
    });
});

describe('personFieldsOf', () => {
    it('accepts the object the live API sends and the array the spec describes', () => {
        expect(personFieldsOf({ personFields: { birthday: '2010-01-01' } })).toEqual({
            birthday: '2010-01-01',
        });
        expect(personFieldsOf({ personFields: [{ zip: '1' }, { city: 'x' }] })).toEqual({
            zip: '1',
            city: 'x',
        });
        expect(personFieldsOf({})).toEqual({});
    });
});
