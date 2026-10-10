import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: client }));

import { getOrCreateModule, readCategory, writeCategory } from './kv-store';

const MODULE = { id: 7, shorty: 'rr' };
const PAYLOAD = { customModuleId: 7, data: '{}', description: 'd', name: 'n', shorty: 'settings' };

beforeEach(() => {
    client.get.mockReset();
    client.post.mockReset();
    client.put.mockReset();
});

describe('getOrCreateModule', () => {
    it('returns the module when it exists', async () => {
        client.get.mockResolvedValueOnce([MODULE]);
        await expect(getOrCreateModule('rr', 'RR', 'desc')).resolves.toEqual(MODULE);
        expect(client.post).not.toHaveBeenCalled();
    });

    it('creates the module when it is genuinely absent', async () => {
        client.get.mockResolvedValueOnce([]);
        client.post.mockResolvedValueOnce(MODULE);
        await expect(getOrCreateModule('rr', 'RR', 'desc')).resolves.toEqual(MODULE);
        expect(client.post).toHaveBeenCalledOnce();
    });

    it('does not create a module when the lookup itself fails', async () => {
        client.get.mockRejectedValueOnce(new Error('503'));
        await expect(getOrCreateModule('rr', 'RR', 'desc')).rejects.toThrow('503');
        expect(client.post).not.toHaveBeenCalled();
    });
});

describe('readCategory', () => {
    it('returns the category with its data parsed', async () => {
        client.get.mockResolvedValueOnce([
            { id: 1, shorty: 'other', data: '{}' },
            { id: 2, shorty: 'settings', data: '{"gateGroupId":42}' },
        ]);
        await expect(readCategory(MODULE.id, 'settings')).resolves.toMatchObject({
            category: { id: 2 },
            data: { gateGroupId: 42 },
        });
        expect(client.get).toHaveBeenCalledWith('/custommodules/7/customdatacategories');
    });

    it('returns undefined when there is no such category', async () => {
        client.get.mockResolvedValueOnce([]);
        await expect(readCategory(MODULE.id, 'settings')).resolves.toBeUndefined();
    });

    // A record that cannot be parsed is unreadable, not empty: reading it as
    // `{}` would make the installation look unconfigured and hand the setup
    // form to whoever is looking.
    it('throws on data that is not valid JSON', async () => {
        client.get.mockResolvedValueOnce([{ id: 1, shorty: 'settings', data: '{"gateGr' }]);
        await expect(readCategory(MODULE.id, 'settings')).rejects.toThrow();
    });
});

describe('writeCategory', () => {
    it('creates a category that does not exist yet', async () => {
        await writeCategory(7, PAYLOAD);
        expect(client.post).toHaveBeenCalledWith('/custommodules/7/customdatacategories', PAYLOAD);
    });

    it('replaces an existing one with the full payload', async () => {
        await writeCategory(7, PAYLOAD, 3);
        expect(client.put).toHaveBeenCalledWith('/custommodules/7/customdatacategories/3', PAYLOAD);
    });
});
