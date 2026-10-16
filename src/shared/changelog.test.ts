import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = vi.hoisted(() => ({ findModule: vi.fn(), readCategory: vi.fn() }));
vi.mock('./kv-store', () => kv);

import { parseChangeLog, readStoredChangeLog, windowStart } from './changelog';
import type { ChangeLog } from './changelog';
import { formatDateTime, formatDayMonth } from './format';

const LOG: ChangeLog = {
    syncedAt: '2026-10-14T16:32:00.000Z',
    since: '2026-09-14T16:32:00.000Z',
    linesRead: 1063,
    linesUnparsed: 2,
    entries: [
        {
            logId: 7,
            at: '2026-10-13T10:00:00Z',
            kind: 'role',
            personName: 'Lotte Test',
            personId: 36532,
            groupId: 1569,
            groupName: 'RR Pfadfinderteam Schneefüchse',
            role: 'Leiter',
            from: 'Teilnehmer',
            actor: 'Julia Test',
        },
        {
            logId: 5,
            at: '2026-10-12T10:00:00Z',
            kind: 'removed',
            personName: 'Leah Test',
            personId: null,
            groupId: 2646,
            groupName: 'RR Teilnehmer',
            role: 'Teilnehmer',
            actor: '',
        },
    ],
};

describe('parseChangeLog', () => {
    it('round-trips a stored log', () => {
        expect(parseChangeLog(JSON.parse(JSON.stringify(LOG)))).toEqual(LOG);
    });

    it.each([[{}], [null], ['nope'], [{ entries: [] }]])('is unreadable for %j', (raw) => {
        expect(parseChangeLog(raw)).toBeNull();
    });

    it('drops a broken entry and keeps its neighbours', () => {
        const raw = {
            ...LOG,
            entries: [
                LOG.entries[0],
                { ...LOG.entries[1], logId: 'x' },
                { ...LOG.entries[1], kind: 'moved' },
            ],
        };
        expect(parseChangeLog(raw)?.entries).toEqual([LOG.entries[0]]);
    });

    it('is unreadable when every entry is broken — never "no changes"', () => {
        expect(parseChangeLog({ ...LOG, entries: [{ logId: 1, kind: 'moved' }] })).toBeNull();
    });
});

describe('windowStart', () => {
    it('is 30 days before now', () => {
        expect(windowStart(new Date('2026-10-16T06:00:00Z')).toISOString()).toBe(
            '2026-09-16T06:00:00.000Z',
        );
    });
});

describe('readStoredChangeLog', () => {
    beforeEach(() => {
        kv.findModule.mockReset();
        kv.readCategory.mockReset();
    });

    it('is "never" without a module', async () => {
        kv.findModule.mockResolvedValueOnce(undefined);
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'never' });
        expect(kv.readCategory).not.toHaveBeenCalled();
    });

    it('is "never" without the category', async () => {
        kv.findModule.mockResolvedValueOnce({ id: 3 });
        kv.readCategory.mockResolvedValueOnce(undefined);
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'never' });
        expect(kv.readCategory).toHaveBeenCalledWith(3, 'changelog');
    });

    it('is "unreadable" when the data is not a log', async () => {
        kv.findModule.mockResolvedValueOnce({ id: 3 });
        kv.readCategory.mockResolvedValueOnce({ category: { id: 9 }, data: {} });
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'unreadable' });
    });

    it('is "ready" with the parsed log', async () => {
        kv.findModule.mockResolvedValueOnce({ id: 3 });
        kv.readCategory.mockResolvedValueOnce({ category: { id: 9 }, data: LOG });
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'ready', log: LOG });
    });

    it('lets a failed read throw', async () => {
        kv.findModule.mockRejectedValueOnce(new Error('403'));
        await expect(readStoredChangeLog()).rejects.toThrow('403');
    });
});

describe('format', () => {
    it('formats day and month with a trailing dot', () => {
        expect(formatDayMonth(new Date(2026, 9, 6))).toBe('06.10.');
    });

    it('formats a full timestamp', () => {
        expect(formatDateTime(new Date(2026, 9, 14, 18, 32))).toBe('14.10.2026 18:32');
    });
});
