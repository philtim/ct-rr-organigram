/**
 * The Änderungsprotokoll as the KV-Store holds it: membership changes of the
 * last 30 days, read from the ChurchTools log by the admin and stored
 * sanitised (docs/design/003-aenderungsprotokoll.md). The dashboard reads
 * only this; it never touches the log itself.
 */
import { findModule, readCategory } from './kv-store';
import { EXTENSION_KEY } from './constants';

export const CHANGELOG_SHORTY = 'changelog';
export const WINDOW_DAYS = 30;

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

/**
 * Read what the KV-Store holds into a `ChangeLog`, or null when it is not
 * one. Unreadable is its own state: an empty list would claim "no changes"
 * about data nobody could read.
 */
export function parseChangeLog(raw: unknown): ChangeLog | null {
    if (!isRecord(raw)) return null;
    const syncedAt = str(raw.syncedAt);
    const since = str(raw.since);
    if (!syncedAt || !since || !Array.isArray(raw.entries)) return null;
    const entries = raw.entries.map(parseEntry).filter((e): e is ChangeEntry => e !== null);
    // Every entry unreadable is a document we cannot read, not an empty one.
    if (raw.entries.length && !entries.length) return null;
    return {
        syncedAt,
        since,
        linesRead: int(raw.linesRead) ?? 0,
        linesUnparsed: int(raw.linesUnparsed) ?? 0,
        entries,
    };
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
    return log ? { phase: 'ready', log } : { phase: 'unreadable' };
}
