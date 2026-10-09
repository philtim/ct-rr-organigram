/**
 * Thin wrapper around `@churchtools/churchtools-client` (ADR-005).
 * Feature-level API calls live in each feature's `*.api.ts` and import from here.
 */
import { churchtoolsClient } from '@churchtools/churchtools-client';

export const ct = churchtoolsClient;

declare const window: Window &
    typeof globalThis & {
        settings?: { base_url?: string };
    };

/**
 * The ChurchTools instance this extension is talking to.
 * `base_url` (injected by the host) or VITE_BASE_URL may carry a trailing
 * path segment (e.g. when the extension is loaded inside a /groups/X view),
 * so reduce it to the origin.
 */
export function getInstanceOrigin(): string {
    const raw = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL ?? '';
    try {
        return new URL(raw, window.location.href).origin;
    } catch {
        return raw.replace(/\/+$/, '');
    }
}

/** Build a link to a ChurchTools group's detail page. */
export function getGroupFrontendUrl(groupId: number): string {
    return `${getInstanceOrigin()}/groups/${groupId}`;
}

/**
 * Retry a request that came back HTTP 429, with increasing delays.
 *
 * A tab that asks about every team and every person individually makes some
 * hundreds of requests. The live instance answers them, but rate-limits a
 * second run in quick succession — observed during verification of the
 * Beitragsabrechnung, not theorised. Without this, a reload shows "could not
 * be loaded" and the user has no idea that waiting a moment is the fix.
 *
 * Only 429 is retried. Every other failure is a real failure and is raised
 * straight away rather than hidden behind three slow attempts.
 */
export async function withRetryOn429<T>(call: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await call();
        } catch (e) {
            if (attempt >= attempts || statusOf(e) !== 429) throw e;
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
    }
}

function statusOf(e: unknown): number | undefined {
    if (typeof e === 'object' && e !== null) {
        const maybe = e as { response?: { status?: number }; status?: number };
        return maybe.response?.status ?? maybe.status;
    }
    return undefined;
}

/**
 * Bounded-concurrency map. Hundreds of requests fired at once would be
 * throttled by the browser and unkind to the instance; a handful in flight is
 * plenty.
 */
export async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        for (;;) {
            const index = next++;
            if (index >= items.length) return;
            results[index] = await fn(items[index]);
        }
    });

    await Promise.all(workers);
    return results;
}

/**
 * Every page of a group's member list.
 *
 * `limit=200` is the endpoint's cap, not the size of a group. Reading one
 * page silently truncates anything larger, and the figures built from it —
 * the organigram's tiles, the Beitragsabrechnung, the Jahresmeldung that goes
 * to the Bundesverband — come out too low with nothing to show for it. That
 * is the one failure mode this project treats as worse than an error.
 *
 * Throws when a page fails, so callers decide; they already mark the node or
 * the row as incomplete. It throws at the page cap too, rather than returning
 * a short list: 100 pages is 20,000 members and nobody should reach it, but
 * truncating in silence is the failure this function exists to remove.
 */
const MEMBER_PAGE_LIMIT = 200;
const MAX_MEMBER_PAGES = 100;

export async function fetchAllMembers<T>(groupId: number, query: string): Promise<T[]> {
    const rows: T[] = [];
    for (let page = 1; page <= MAX_MEMBER_PAGES; page++) {
        const batch = await withRetryOn429(() =>
            ct.get<T[]>(`/groups/${groupId}/members?${query}&page=${page}`),
        );
        if (!batch || batch.length === 0) return rows;
        rows.push(...batch);
        if (batch.length < MEMBER_PAGE_LIMIT) return rows;
    }
    throw new Error(
        `Gruppe ${groupId} hat mehr als ${MAX_MEMBER_PAGES * MEMBER_PAGE_LIMIT} aktive ` +
            'Mitglieder — die Liste wäre unvollständig.',
    );
}

/**
 * Single shared error type so the toast component can display
 * consistent messages regardless of which feature triggered it.
 */
export class ChurchToolsApiError extends Error {
    public readonly endpoint: string;
    public readonly status: number;

    constructor(endpoint: string, status: number, message: string) {
        super(message);
        this.name = 'ChurchToolsApiError';
        this.endpoint = endpoint;
        this.status = status;
    }
}

/**
 * Fetch all pages of a paginated endpoint with safety guards.
 * Stops on empty page, on `maxPages`, or when the same first-item
 * signature reappears (defensive against pagination loops).
 *
 * Pass per-endpoint limits explicitly — different endpoints cap at
 * different sizes (groups: 200, members: 200, services: not paginated).
 */
export async function fetchAllPages<T extends { id?: number | string }>(
    url: string,
    options: { limit?: number; maxPages?: number } = {},
): Promise<T[]> {
    const limit = options.limit ?? 100;
    const maxPages = options.maxPages ?? 100;

    const results: T[] = [];
    let firstIdSignature: string | null = null;

    for (let page = 1; page <= maxPages; page++) {
        const sep = url.includes('?') ? '&' : '?';
        const pageUrl = `${url}${sep}page=${page}&limit=${limit}`;
        const items = await ct.get<T[]>(pageUrl);

        if (!items || items.length === 0) break;

        const sig = items[0]?.id != null ? String(items[0].id) : null;
        if (sig !== null && sig === firstIdSignature) break;
        firstIdSignature = sig;

        results.push(...items);
        if (items.length < limit) break;
    }

    return results;
}
