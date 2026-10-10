import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: client }));

import { getCustomDataCategory, getOrCreateModule } from './kv-store';

const MODULE = { id: 7, shorty: 'rr' };

beforeEach(() => {
    client.get.mockReset();
    client.post.mockReset();
});

describe('getOrCreateModule', () => {
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

describe('getCustomDataCategory', () => {
    it('merges the parsed data into the category', async () => {
        client.get.mockResolvedValueOnce([
            { id: 1, shorty: 'settings', data: '{"gateGroupId":42}' },
        ]);
        await expect(getCustomDataCategory('settings', MODULE.id)).resolves.toMatchObject({
            id: 1,
            gateGroupId: 42,
        });
    });

    it('uses the module id it is given instead of looking the module up again', async () => {
        client.get.mockResolvedValueOnce([]);
        await getCustomDataCategory('settings', MODULE.id);
        expect(client.get).toHaveBeenCalledOnce();
        expect(client.get).toHaveBeenCalledWith('/custommodules/7/customdatacategories');
    });

    // A record that cannot be parsed is unreadable, not empty: reading it as
    // `{}` would make the installation look unconfigured and hand the setup
    // form to whoever is looking.
    it('throws on data that is not valid JSON', async () => {
        client.get.mockResolvedValueOnce([{ id: 1, shorty: 'settings', data: '{"gateGr' }]);
        await expect(getCustomDataCategory('settings', MODULE.id)).rejects.toThrow();
    });
});
