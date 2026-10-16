import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => ({ readStoredChangeLog: vi.fn() }));
vi.mock('@/shared/changelog', () => shared);

import { useChangelog } from './useChangelog';

const LOG = { syncedAt: 's', since: 't', linesRead: 0, linesUnparsed: 0, entries: [] };

beforeEach(() => {
    shared.readStoredChangeLog.mockReset();
});

describe('useChangelog', () => {
    it('starts loading', () => {
        expect(useChangelog().state.value).toEqual({ phase: 'loading' });
    });

    it.each([
        [{ phase: 'never' }, { phase: 'never' }],
        [{ phase: 'unreadable' }, { phase: 'unreadable' }],
        [
            { phase: 'ready', log: LOG },
            { phase: 'ready', log: LOG },
        ],
    ])('mirrors the stored %j', async (stored, expected) => {
        shared.readStoredChangeLog.mockResolvedValueOnce(stored);
        const { state, load } = useChangelog();
        await load();
        expect(state.value).toEqual(expected);
    });

    it('is unreadable when the read throws — never "no changes"', async () => {
        shared.readStoredChangeLog.mockRejectedValueOnce(new Error('403'));
        const { state, load } = useChangelog();
        await load();
        expect(state.value).toEqual({ phase: 'unreadable' });
    });
});
