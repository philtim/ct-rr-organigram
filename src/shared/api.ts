/**
 * Thin wrapper around `@churchtools/churchtools-client` (ADR-005).
 * Feature-level API calls live in each feature's `*.api.ts` and import from here.
 */
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { API_TIMEOUT_MS } from './constants';
import { COPY } from './copy';

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
 * Reject when a request has not answered within `ms`.
 *
 * The client sets no timeout of its own, so a request that never answers
 * would leave a tab saying "loading" forever, with no error and no retry.
 * The request itself keeps running — the client cannot cancel it — but the
 * caller gets a failure it can show.
 */
export async function withTimeout<T>(p: Promise<T>, ms: number = API_TIMEOUT_MS): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(COPY.requestTimedOut(ms / 1000))), ms);
    });
    try {
        return await Promise.race([p, deadline]);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Retry a request that came back HTTP 429, with increasing delays.
 *
 * Every attempt has the deadline of `withTimeout`, so every read that goes
 * through here — which is nearly all of them — fails rather than hangs.
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
            return await withTimeout(call());
        } catch (e) {
            if (attempt >= attempts || statusOf(e) !== 429) throw e;
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
    }
}

/** The HTTP status of a failed request, from either shape the client throws. */
export function statusOf(e: unknown): number | undefined {
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
 * Every page of a paginated endpoint.
 *
 * Reading one page silently truncates anything larger, and the figures built
 * from it — the organigram's tiles, the Beitragsabrechnung, the Jahresmeldung
 * that goes to the Bundesverband — come out too low with nothing to show for
 * it. That is the one failure mode this project treats as worse than an
 * error, so this throws when a page fails, and throws at the page cap rather
 * than returning a short list.
 *
 * It stops at the last page the server reports (`meta.pagination.lastPage`),
 * not at the first short page: a short page only means "the end" if the
 * server honoured the requested `limit`, and the pagination block says so
 * without that assumption. The short-page rule remains the fallback for a
 * response that carries no pagination block.
 */
const MAX_PAGES = 100;

type RawPage<T> = { data?: { data?: T[]; meta?: { pagination?: { lastPage?: number } } } };

export async function fetchAllPages<T>(url: string, limit: number): Promise<T[]> {
    const separator = url.includes('?') ? '&' : '?';
    const rows: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const response = await withRetryOn429(() =>
            ct.get<RawPage<T>>(
                `${url}${separator}limit=${limit}&page=${page}`,
                {},
                {
                    rawResponse: true,
                },
            ),
        );
        const batch = response?.data?.data ?? [];
        const lastPage = response?.data?.meta?.pagination?.lastPage;
        rows.push(...batch);
        if (batch.length === 0) return rows;
        if (lastPage !== undefined ? page >= lastPage : batch.length < limit) return rows;
    }
    throw new Error(COPY.listTruncated(url, MAX_PAGES * limit));
}
