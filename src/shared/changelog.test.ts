import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = vi.hoisted(() => ({
    findModule: vi.fn(),
    findCategory: vi.fn(),
    readCategory: vi.fn(),
    writeCategory: vi.fn(),
    listValues: vi.fn(),
    createValue: vi.fn(),
    deleteValue: vi.fn(),
}));
vi.mock('./kv-store', () => kv);

import {
    VALUE_MAX_CHARS,
    packChunks,
    parseChangeLog,
    parseChunk,
    readStoredChangeLog,
    windowStart,
    writeStoredChangeLog,
} from './changelog';
import { COPY } from './copy';
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

describe('packChunks', () => {
    const entry = (logId: number) => ({ ...LOG.entries[1], logId });

    it('keeps every chunk under the value limit and loses nothing', () => {
        const big = { ...LOG, entries: Array.from({ length: 300 }, (_, i) => entry(i)) };
        const chunks = packChunks(big);
        expect(chunks.length).toBeGreaterThan(1);
        for (const c of chunks) expect(c.length).toBeLessThanOrEqual(VALUE_MAX_CHARS);
        const back = chunks.flatMap((c) => parseChunk(JSON.parse(c))!.entries);
        expect(back).toEqual(big.entries);
        for (const c of chunks) expect(parseChunk(JSON.parse(c))!.syncedAt).toBe(LOG.syncedAt);
    });

    it('packs an empty log into no chunk at all', () => {
        expect(packChunks({ ...LOG, entries: [] })).toEqual([]);
    });
});

describe('parseChunk', () => {
    it.each([[{}], [null], [{ syncedAt: 's' }], [{ syncedAt: 's', entries: [{ logId: 'x' }] }]])(
        'is null for %j',
        (raw) => expect(parseChunk(raw)).toBeNull(),
    );
});

describe('readStoredChangeLog', () => {
    const header = { ...LOG, entries: undefined };
    const chunk = (syncedAt: string, entries: unknown[]) => ({
        id: 1,
        dataCategoryId: 9,
        value: JSON.stringify({ syncedAt, entries }),
    });

    beforeEach(() => {
        for (const fn of Object.values(kv)) fn.mockReset();
        kv.findModule.mockResolvedValue({ id: 3 });
    });

    it('is "never" without a module', async () => {
        kv.findModule.mockResolvedValueOnce(undefined);
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'never' });
        expect(kv.readCategory).not.toHaveBeenCalled();
    });

    it('is "never" without the category', async () => {
        kv.readCategory.mockResolvedValueOnce(undefined);
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'never' });
        expect(kv.readCategory).toHaveBeenCalledWith(3, 'changelog');
    });

    it('is "unreadable" when the header is not a log', async () => {
        kv.readCategory.mockResolvedValueOnce({ category: { id: 9 }, data: {} });
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'unreadable' });
    });

    it('assembles the entries from the chunks of the current sync, newest first', async () => {
        kv.readCategory.mockResolvedValueOnce({ category: { id: 9 }, data: header });
        kv.listValues.mockResolvedValueOnce([
            chunk(LOG.syncedAt, [LOG.entries[1]]),
            chunk('2026-01-01T00:00:00.000Z', [{ ...LOG.entries[0], logId: 99 }]),
            chunk(LOG.syncedAt, [LOG.entries[0]]),
        ]);
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'ready', log: LOG });
        expect(kv.listValues).toHaveBeenCalledWith(3, 9);
    });

    it('still reads a log stored with its entries inline', async () => {
        kv.readCategory.mockResolvedValueOnce({ category: { id: 9 }, data: LOG });
        kv.listValues.mockResolvedValueOnce([]);
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'ready', log: LOG });
    });

    it('is "unreadable" when a chunk of the current sync cannot be read', async () => {
        kv.readCategory.mockResolvedValueOnce({ category: { id: 9 }, data: header });
        kv.listValues.mockResolvedValueOnce([
            chunk(LOG.syncedAt, [LOG.entries[0]]),
            {
                id: 2,
                dataCategoryId: 9,
                value: '{"syncedAt":"' + LOG.syncedAt + '","entries":[{}]}',
            },
        ]);
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'unreadable' });
    });

    it('is "unreadable" when a chunk of the current sync is missing', async () => {
        kv.readCategory.mockResolvedValueOnce({
            category: { id: 9 },
            data: { ...header, entryCount: 2 },
        });
        kv.listValues.mockResolvedValueOnce([chunk(LOG.syncedAt, [LOG.entries[0]])]);
        await expect(readStoredChangeLog()).resolves.toEqual({ phase: 'unreadable' });
    });

    it('lets a failed read throw', async () => {
        kv.findModule.mockRejectedValueOnce(new Error('403'));
        await expect(readStoredChangeLog()).rejects.toThrow('403');
    });
});

describe('writeStoredChangeLog', () => {
    beforeEach(() => {
        for (const fn of Object.values(kv)) fn.mockReset();
        kv.findModule.mockResolvedValue({ id: 3 });
        kv.createValue.mockResolvedValue(undefined);
        kv.deleteValue.mockResolvedValue(undefined);
        kv.writeCategory.mockResolvedValue(undefined);
    });

    it('creates the chunks, then the header, then drops the stale chunks', async () => {
        kv.findCategory.mockResolvedValueOnce({ id: 9, name: 'N', description: 'D' });
        kv.listValues.mockResolvedValueOnce([
            { id: 5, dataCategoryId: 9, value: JSON.stringify({ syncedAt: 'old', entries: [] }) },
            { id: 6, dataCategoryId: 9, value: 'garbage' },
        ]);
        const order: string[] = [];
        kv.createValue.mockImplementation(async () => void order.push('create'));
        kv.writeCategory.mockImplementation(async () => void order.push('header'));
        kv.deleteValue.mockImplementation(
            async (_m: number, _c: number, id: number) => void order.push(`delete ${id}`),
        );
        await writeStoredChangeLog(LOG);
        expect(order).toEqual(['create', 'header', 'delete 5', 'delete 6']);
        expect(kv.createValue).toHaveBeenCalledWith(3, 9, packChunks(LOG)[0]);
        expect(kv.writeCategory).toHaveBeenCalledWith(
            3,
            {
                customModuleId: 3,
                data: JSON.stringify({ ...LOG, entries: undefined, entryCount: 2 }),
                description: 'D',
                name: 'N',
                shorty: 'changelog',
            },
            9,
        );
    });

    it('creates the category first when there is none', async () => {
        kv.findCategory.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: 9 });
        kv.listValues.mockResolvedValueOnce([]);
        await writeStoredChangeLog(LOG);
        expect(kv.writeCategory).toHaveBeenCalledTimes(2);
        expect(kv.createValue).toHaveBeenCalledWith(3, 9, expect.any(String));
    });

    it('refuses without a module', async () => {
        kv.findModule.mockResolvedValueOnce(undefined);
        await expect(writeStoredChangeLog(LOG)).rejects.toThrow(COPY.adminChangelogNoModule);
        expect(kv.writeCategory).not.toHaveBeenCalled();
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
