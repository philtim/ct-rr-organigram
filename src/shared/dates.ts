/**
 * Date helpers for the Beitragsabrechnung and the Jahresmeldung. Everything
 * here works on UTC calendar dates, so no timezone can move a birthday.
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

function completedYears(born: Date, reference: Date): number {
    let age = reference.getUTCFullYear() - born.getUTCFullYear();
    const monthDiff = reference.getUTCMonth() - born.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < born.getUTCDate())) {
        age -= 1;
    }
    return age;
}

/** Completed years at `dueDate`, for the export's age column. */
export function ageAt(birthday: string | null, dueDate: Date): number | null {
    const born = parseIsoDate(birthday);
    if (!born) return null;
    const age = completedYears(born, dueDate);
    return age >= 0 ? age : null;
}

/**
 * Today as a calendar date at UTC midnight.
 *
 * Exists so the two callers of `ageBucket` hand it the same kind of value.
 * `nextDueDate` already returns UTC midnight; reading "now" with local
 * getters and comparing the two shifts somebody's 18th birthday by a day in
 * any negative-offset timezone.
 */
export function todayUtc(now: Date = new Date()): Date {
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export type AgeBucket = 'adult' | 'minor' | 'unknown';

/**
 * Which side of 18 somebody is on, on a given day.
 *
 * The answer decides whether somebody is reported to the Bund as a
 * Juniorleiter or as a Mitarbeiter, and which rate they are billed — so both
 * sides are read in UTC: the birthday as written, the reference date as a UTC
 * calendar date.
 *
 * Anything unparseable is `unknown`, never `adult` — a silent misfiling into
 * Mitarbeiter is exactly the error the Jahresmeldung exists to surface.
 */
export function ageBucket(birthday: string | null | undefined, reference: Date): AgeBucket {
    const born = parseIsoDate(birthday ?? null);
    if (!born) return 'unknown';
    return completedYears(born, reference) >= 18 ? 'adult' : 'minor';
}
