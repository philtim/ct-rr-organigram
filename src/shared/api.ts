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
 * Build a link to a ChurchTools group's detail page.
 * `base_url` (injected by the host) or VITE_BASE_URL may carry a trailing
 * path segment (e.g. when the extension is loaded inside a /groups/X view).
 * Extract the origin so we always emit a clean `{origin}/groups/{id}`.
 */
export function getGroupFrontendUrl(groupId: number): string {
    const raw = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL ?? '';
    let origin = raw.replace(/\/+$/, '');
    try {
        origin = new URL(raw, window.location.href).origin;
    } catch {
        /* fall through with the trimmed value */
    }
    return `${origin}/groups/${groupId}`;
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
