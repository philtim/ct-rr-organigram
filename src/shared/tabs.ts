/**
 * Tab routing (ADR-007). One custom module serves several views; the active
 * one comes from the `tab` query parameter, extending the pattern `?admin=1`
 * already established. No Vue Router: flat views, no nested routes, no
 * route params.
 */
export type TabId = 'organigram' | 'beitraege' | 'jahresmeldung';

export const DEFAULT_TAB: TabId = 'organigram';

const TAB_IDS: readonly TabId[] = ['organigram', 'beitraege', 'jahresmeldung'];

export function isTabId(value: string | null | undefined): value is TabId {
    return value != null && (TAB_IDS as readonly string[]).includes(value);
}

/** Read the active tab from the current URL, falling back to the default. */
export function readTabFromUrl(search?: string): TabId {
    if (typeof window === 'undefined' && search === undefined) return DEFAULT_TAB;
    const query = search ?? window.location.search;
    const value = new URLSearchParams(query).get('tab');
    return isTabId(value) ? value : DEFAULT_TAB;
}

/**
 * The absolute address of the configuration form, from the current one.
 *
 * Absolute, because the host page sets `<base>` to the instance root: a relative
 * `?admin=1` resolves against the instance's root and lands on the
 * ChurchTools home page instead of this extension. The tab parameter goes —
 * the form has none — and every other one stays.
 */
export function adminUrl(href?: string): string {
    const url = new URL(href ?? window.location.href);
    url.searchParams.delete('tab');
    url.searchParams.set('admin', '1');
    return url.toString();
}

/**
 * Reflect the active tab in the address bar so a view can be linked and the
 * browser's back button works. Every other query parameter is preserved —
 * the host may have put its own there.
 */
export function writeTabToUrl(tab: TabId): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab === DEFAULT_TAB) url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    window.history.pushState({ tab }, '', url);
}
