import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ syncChangeLog: vi.fn() }));
const shared = vi.hoisted(() => ({ readStoredChangeLog: vi.fn(), writeStoredChangeLog: vi.fn() }));
vi.mock('./changelog.api', () => api);
vi.mock('@/shared/changelog', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/shared/changelog')>()),
    ...shared,
}));

import { useChangelogSync } from './useChangelogSync';
import type { ChangeLog } from '@/shared/changelog';
import { COPY } from '@/shared/copy';
import { EMPTY_SETTINGS } from '@/shared/settings';

const OLD: ChangeLog = {
    syncedAt: '2026-10-01T00:00:00.000Z',
    since: '2026-09-01T00:00:00.000Z',
    linesRead: 1,
    linesUnparsed: 0,
    entries: [],
};
const NEW: ChangeLog = { ...OLD, syncedAt: '2026-10-16T00:00:00.000Z', linesRead: 9 };

beforeEach(() => {
    for (const fn of [...Object.values(api), ...Object.values(shared)]) {
        fn.mockReset();
    }
});

describe('load', () => {
    it.each([
        [{ phase: 'never' }, { phase: 'never' }],
        [{ phase: 'unreadable' }, { phase: 'unreadable' }],
        [
            { phase: 'ready', log: OLD },
            { phase: 'stored', log: OLD },
        ],
    ])('mirrors the stored %j', async (stored, expected) => {
        shared.readStoredChangeLog.mockResolvedValueOnce(stored);
        const { state, load } = useChangelogSync();
        await load();
        expect(state.value).toEqual(expected);
    });

    it('is unreadable when the read throws', async () => {
        shared.readStoredChangeLog.mockRejectedValueOnce(new Error('503'));
        const { state, load } = useChangelogSync();
        await load();
        expect(state.value).toEqual({ phase: 'unreadable' });
    });
});

describe('run', () => {
    it('stores the new log and keeps it', async () => {
        api.syncChangeLog.mockResolvedValueOnce(NEW);
        shared.writeStoredChangeLog.mockResolvedValueOnce(undefined);
        const { state, run } = useChangelogSync();
        await run(EMPTY_SETTINGS);
        expect(shared.writeStoredChangeLog).toHaveBeenCalledWith(NEW);
        expect(state.value).toEqual({ phase: 'stored', log: NEW });
    });

    it('names the permission on 403 and leaves the old log alone', async () => {
        shared.readStoredChangeLog.mockResolvedValueOnce({ phase: 'ready', log: OLD });
        api.syncChangeLog.mockRejectedValueOnce({ response: { status: 403 } });
        const { state, load, run } = useChangelogSync();
        await load();
        await run(EMPTY_SETTINGS);
        expect(state.value).toEqual({
            phase: 'error',
            message: COPY.adminChangelogForbidden,
            log: OLD,
        });
        expect(shared.writeStoredChangeLog).not.toHaveBeenCalled();
    });

    it('reports a failed write and keeps the old log', async () => {
        shared.readStoredChangeLog.mockResolvedValueOnce({ phase: 'ready', log: OLD });
        api.syncChangeLog.mockResolvedValueOnce(NEW);
        shared.writeStoredChangeLog.mockRejectedValueOnce(new Error('500'));
        const { state, load, run } = useChangelogSync();
        await load();
        await run(EMPTY_SETTINGS);
        expect(state.value).toEqual({ phase: 'error', message: '500', log: OLD });
    });
});
