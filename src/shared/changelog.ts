/**
 * The Änderungsprotokoll as the KV-Store holds it: membership changes of the
 * last 30 days, read from the ChurchTools log by the admin and stored
 * sanitised (docs/design/003-aenderungsprotokoll.md). The dashboard reads
 * only this; it never touches the log itself.
 */
import {
    createValue,
    deleteValue,
    findCategory,
    findModule,
    listValues,
    readCategory,
    writeCategory,
} from './kv-store';
import { EXTENSION_KEY } from './constants';
import { COPY } from './copy';

export const CHANGELOG_SHORTY = 'changelog';
export const WINDOW_DAYS = 30;
/** What one KV value row holds, measured on rr-demo (2026-10-16). */
export const VALUE_MAX_CHARS = 10_000;
const CATEGORY_NAME = 'Änderungsprotokoll';
const CATEGORY_DESCRIPTION =
    'Mitgliedschafts-Änderungen der letzten 30 Tage, vom Admin aus dem Log abgerufen.';

export type ChangeKind = 'added' | 'removed' | 'role' | 'status';
const KINDS: readonly ChangeKind[] = ['added', 'removed', 'role', 'status'];

export type ChangeEntry = {
    /** Log id. Unique together with `kind`: one log line can yield two entries. */
    logId: number;
    /** When the change happened, ISO. */
    at: string;
    kind: ChangeKind;
    personName: string;
    /** Null when the log line carried none and the membership no longer resolves. */
    personId: number | null;
    groupId: number;
    groupName: string;
    /** added/removed: the role; role: the new role. */
    role?: string;
    /** role/status: the old value. */
    from?: string;
    /** status: the new status; added: the status when not active. */
    to?: string;
    /** Who made the change, as the log names them. */
    actor: string;
};

export type ChangeLog = {
    /** When the admin fetched, ISO. */
    syncedAt: string;
    /** Start of the window read, ISO: `syncedAt` minus 30 days. */
    since: string;
    /** Log lines read before filtering — shown to the admin. */
    linesRead: number;
    /** Lines in the window whose form the parser did not know. */
    linesUnparsed: number;
    entries: ChangeEntry[];
};

export function windowStart(now: Date): Date {
    return new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const int = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isInteger(v) ? v : undefined;

function parseEntry(raw: unknown): ChangeEntry | null {
    if (!isRecord(raw)) return null;
    const logId = int(raw.logId);
    const at = str(raw.at);
    const kind = KINDS.find((k) => k === raw.kind);
    const personName = str(raw.personName);
    const groupId = int(raw.groupId);
    const groupName = str(raw.groupName);
    if (logId === undefined || !at || !kind || personName === undefined) return null;
    if (groupId === undefined || groupName === undefined) return null;
    const entry: ChangeEntry = {
        logId,
        at,
        kind,
        personName,
        personId: int(raw.personId) ?? null,
        groupId,
        groupName,
        actor: str(raw.actor) ?? '',
    };
    const role = str(raw.role);
    const from = str(raw.from);
    const to = str(raw.to);
    if (role !== undefined) entry.role = role;
    if (from !== undefined) entry.from = from;
    if (to !== undefined) entry.to = to;
    return entry;
}

function parseEntries(raw: unknown): ChangeEntry[] | null {
    if (!Array.isArray(raw)) return null;
    const entries = raw.map(parseEntry).filter((e): e is ChangeEntry => e !== null);
    // Every entry unreadable is a document we cannot read, not an empty one.
    return raw.length && !entries.length ? null : entries;
}

/**
 * Read the stored header into a `ChangeLog`, or null when it is not one.
 * Unreadable is its own state: an empty list would claim "no changes"
 * about data nobody could read. The entries live in value rows (see
 * `packChunks`); a header written before that change still carries them
 * inline, and that is read too.
 */
export function parseChangeLog(raw: unknown): ChangeLog | null {
    if (!isRecord(raw)) return null;
    const syncedAt = str(raw.syncedAt);
    const since = str(raw.since);
    if (!syncedAt || !since) return null;
    const entries = raw.entries === undefined ? [] : parseEntries(raw.entries);
    if (!entries) return null;
    return {
        syncedAt,
        since,
        linesRead: int(raw.linesRead) ?? 0,
        linesUnparsed: int(raw.linesUnparsed) ?? 0,
        entries,
    };
}

type Chunk = { syncedAt: string; entries: ChangeEntry[] };

/** One value row's content, or null when it is not a chunk. */
export function parseChunk(raw: unknown): Chunk | null {
    if (!isRecord(raw)) return null;
    const syncedAt = str(raw.syncedAt);
    const entries = parseEntries(raw.entries);
    return syncedAt && entries ? { syncedAt, entries } : null;
}

/**
 * The entries as value rows: each a JSON chunk under the row limit, stamped
 * with the sync it belongs to, so a reader can tell this sync's rows from
 * leftovers of an older or a half-written one.
 */
export function packChunks(log: ChangeLog): string[] {
    const chunks: string[] = [];
    let current: ChangeEntry[] = [];
    const size = (entries: ChangeEntry[]) =>
        JSON.stringify({ syncedAt: log.syncedAt, entries }).length;
    for (const entry of log.entries) {
        if (current.length && size([...current, entry]) > VALUE_MAX_CHARS) {
            chunks.push(JSON.stringify({ syncedAt: log.syncedAt, entries: current }));
            current = [];
        }
        current.push(entry);
    }
    if (current.length) chunks.push(JSON.stringify({ syncedAt: log.syncedAt, entries: current }));
    return chunks;
}

const byNewest = (a: ChangeEntry, b: ChangeEntry) => b.at.localeCompare(a.at) || b.logId - a.logId;

function chunkOf(value: string): Chunk | null {
    try {
        return parseChunk(JSON.parse(value));
    } catch {
        return null;
    }
}

export type StoredChangeLog =
    | { phase: 'never' }
    | { phase: 'unreadable' }
    | { phase: 'ready'; log: ChangeLog };

/** The stored log. A failed request throws — the caller decides what that means. */
export async function readStoredChangeLog(): Promise<StoredChangeLog> {
    const module = await findModule(EXTENSION_KEY);
    if (!module) return { phase: 'never' };
    const stored = await readCategory(module.id, CHANGELOG_SHORTY);
    if (!stored) return { phase: 'never' };
    const log = parseChangeLog(stored.data);
    if (!log) return { phase: 'unreadable' };
    const entries = [...log.entries];
    for (const row of await listValues(module.id, stored.category.id)) {
        const chunk = chunkOf(row.value);
        // A row of another sync is a leftover, not this log's business. A row
        // of this sync that cannot be read makes the whole log unreadable.
        if (chunk === null) {
            if (row.value.includes(log.syncedAt)) return { phase: 'unreadable' };
            continue;
        }
        if (chunk.syncedAt === log.syncedAt) entries.push(...chunk.entries);
    }
    return { phase: 'ready', log: { ...log, entries: entries.sort(byNewest) } };
}

/**
 * Store a log: chunks first, header second, leftovers last. A failure before
 * the header leaves the old log intact and readable; the new chunks are
 * ignored by their stamp and swept on the next successful write.
 */
export async function writeStoredChangeLog(log: ChangeLog): Promise<void> {
    const module = await findModule(EXTENSION_KEY);
    if (!module) throw new Error(COPY.adminChangelogNoModule);
    const header = (data: string, existing?: { id: number; name?: string; description?: string }) =>
        writeCategory(
            module.id,
            {
                customModuleId: module.id,
                data,
                description: existing?.description ?? CATEGORY_DESCRIPTION,
                name: existing?.name ?? CATEGORY_NAME,
                shorty: CHANGELOG_SHORTY,
            },
            existing?.id,
        );
    let category = await findCategory(module.id, CHANGELOG_SHORTY);
    if (!category) {
        // The rows need a category id; an empty header reads as "unreadable"
        // for the seconds until the real one lands, never as "no changes".
        await header('{}');
        category = await findCategory(module.id, CHANGELOG_SHORTY);
        if (!category) throw new Error(COPY.adminChangelogError);
    }
    const stale = await listValues(module.id, category.id);
    for (const chunk of packChunks(log)) await createValue(module.id, category.id, chunk);
    await header(JSON.stringify({ ...log, entries: undefined }), category);
    for (const row of stale) await deleteValue(module.id, category.id, row.id);
}
