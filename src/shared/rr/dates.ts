/**
 * Date helpers for the Beitragsabrechnung. Separate from `export-rows` so the
 * view can name the due date without pulling the export path into the initial
 * bundle (ADR-010).
 */

/**
 * The next 1 December — the date the fees are collected on.
 *
 * Derived rather than configured: the list is drawn up in autumn for the
 * collection at the start of December, and a date that has to be typed in is a
 * date that will be wrong next year. On 1 December itself the current year
 * still applies; after that the next one does.
 */
export function nextDueDate(today: Date): Date {
    const year = today.getFullYear();
    const dueThisYear = Date.UTC(year, 11, 1);
    const todayAtMidnight = Date.UTC(year, today.getMonth(), today.getDate());
    return new Date(todayAtMidnight <= dueThisYear ? dueThisYear : Date.UTC(year + 1, 11, 1));
}

/** Parse an ISO `yyyy-mm-dd` as UTC midnight, so no timezone can shift the day. */
export function parseIsoDate(value: string | null): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
    if (!match) return null;
    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Completed years at `dueDate`. Informational — no fee depends on age. */
export function ageAt(birthday: string | null, dueDate: Date): number | null {
    const born = parseIsoDate(birthday);
    if (!born) return null;
    let age = dueDate.getUTCFullYear() - born.getUTCFullYear();
    const monthDiff = dueDate.getUTCMonth() - born.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && dueDate.getUTCDate() < born.getUTCDate())) age -= 1;
    return age >= 0 ? age : null;
}
