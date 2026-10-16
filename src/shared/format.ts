/** "HH:MM", 24h — the time of day a view's figures were loaded. */
export function formatTimestamp(d: Date): string {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
}

const two = (n: number) => n.toString().padStart(2, '0');

/** "TT.MM." — the day a change happened; the year is implied by the window. */
export function formatDayMonth(d: Date): string {
    return `${two(d.getDate())}.${two(d.getMonth() + 1)}.`;
}

/** "TT.MM.JJJJ HH:MM" — when a stored stand was fetched. */
export function formatDateTime(d: Date): string {
    return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()} ${formatTimestamp(d)}`;
}
