/** "HH:MM", 24h — the time of day a view's figures were loaded. */
export function formatTimestamp(d: Date): string {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
}
