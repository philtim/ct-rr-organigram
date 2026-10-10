import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: client }));

import { useMembershipGate } from './useMembershipGate';

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

beforeEach(() => {
    client.get.mockReset();
    client.get.mockImplementation(async (url: string) => {
        if (url === '/whoami') return { id: 5 };
        return {};
    });
});

async function gateFor(groupId: number | null) {
    const gate = useMembershipGate();
    await gate.check(groupId);
    return gate.status.value;
}

describe('useMembershipGate', () => {
    it('allows a member of the configured group', async () => {
        await expect(gateFor(42)).resolves.toEqual({ phase: 'allowed' });
        expect(client.get).toHaveBeenCalledWith('/groups/42/members/5');
    });

    it('denies only on 404', async () => {
        client.get.mockImplementation(async (url: string) => {
            if (url === '/whoami') return { id: 5 };
            throw httpError(404);
        });
        await expect(gateFor(42)).resolves.toEqual({ phase: 'denied' });
    });

    it('denies on a 404 as the client actually raises it (axios response.status)', async () => {
        client.get.mockImplementation(async (url: string) => {
            if (url === '/whoami') return { id: 5 };
            throw Object.assign(new Error('Request failed'), { response: { status: 404 } });
        });
        await expect(gateFor(42)).resolves.toEqual({ phase: 'denied' });
    });

    it.each([403, 500, 503])('reports %i as an error, not as a denial', async (status) => {
        client.get.mockImplementation(async (url: string) => {
            if (url === '/whoami') return { id: 5 };
            throw httpError(status);
        });
        const result = await gateFor(42);
        expect(result.phase).toBe('error');
        expect(result).toMatchObject({ message: expect.stringContaining(String(status)) });
    });

    it('reports a failed whoami as an error', async () => {
        client.get.mockRejectedValue(new Error('network'));
        await expect(gateFor(42)).resolves.toMatchObject({ phase: 'error' });
    });

    it('checks nothing when no group is configured', async () => {
        await expect(gateFor(null)).resolves.toEqual({ phase: 'idle' });
        expect(client.get).not.toHaveBeenCalled();
    });
});
