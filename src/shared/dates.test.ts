import { describe, expect, it } from 'vitest';
import { ageAt, ageBucket, nextDueDate, parseIsoDate } from './dates';

describe('nextDueDate', () => {
    it('points at 1 December of the current year when drawn up in autumn', () => {
        expect(nextDueDate(new Date(2026, 9, 9)).toISOString()).toBe('2026-12-01T00:00:00.000Z');
    });

    it('still points at the current year on the due date itself', () => {
        expect(nextDueDate(new Date(2026, 11, 1)).toISOString()).toBe('2026-12-01T00:00:00.000Z');
    });

    it('rolls over to the next year the day after the collection', () => {
        expect(nextDueDate(new Date(2026, 11, 2)).toISOString()).toBe('2027-12-01T00:00:00.000Z');
    });

    it('points at the coming December when run early in the year', () => {
        expect(nextDueDate(new Date(2027, 0, 15)).toISOString()).toBe('2027-12-01T00:00:00.000Z');
    });
});

describe('parseIsoDate', () => {
    it('reads a date as UTC midnight, so no timezone can shift the day', () => {
        const date = parseIsoDate('2014-03-07');
        expect(date?.toISOString()).toBe('2014-03-07T00:00:00.000Z');
    });

    it('returns null for a missing or unparsable value', () => {
        expect(parseIsoDate(null)).toBeNull();
        expect(parseIsoDate('')).toBeNull();
        expect(parseIsoDate('07.03.2014')).toBeNull();
    });
});

describe('ageAt', () => {
    const due = new Date(Date.UTC(2026, 11, 1));

    it('counts completed years', () => {
        expect(ageAt('2014-03-07', due)).toBe(12);
    });

    it('counts the birthday itself as reached', () => {
        expect(ageAt('2014-12-01', due)).toBe(12);
    });

    it('does not count a birthday that falls after the due date', () => {
        expect(ageAt('2014-12-02', due)).toBe(11);
    });

    it('has no answer without a date of birth', () => {
        expect(ageAt(null, due)).toBeNull();
    });
});

describe('ageBucket', () => {
    // UTC midnight, like `todayUtc` and `nextDueDate` produce — a local-time
    // Date here would place the comparison a day off west of UTC.
    const today = new Date(Date.UTC(2026, 9, 9)); // 2026-10-09

    it('counts somebody 18 or older as an adult', () => {
        expect(ageBucket('2008-10-09', today)).toBe('adult');
        expect(ageBucket('1970-01-01', today)).toBe('adult');
    });

    it('counts somebody under 18 as a minor', () => {
        expect(ageBucket('2009-01-01', today)).toBe('minor');
    });

    it('does not promote somebody whose birthday is later this year', () => {
        // Turns 18 on 2026-10-10 — still a Juniorleiter today.
        expect(ageBucket('2008-10-10', today)).toBe('minor');
    });

    it('promotes somebody exactly on their 18th birthday', () => {
        expect(ageBucket('2008-10-09', today)).toBe('adult');
    });

    it('accepts the full ISO timestamp ChurchTools may send', () => {
        expect(ageBucket('2009-01-01T00:00:00Z', today)).toBe('minor');
    });

    it('does not move a birthday across a timezone boundary', () => {
        // The 18th birthday is the due date itself. Read in local time west
        // of UTC the reference would fall back a day and the person would
        // still be billed, and reported, as a minor.
        const dueDate = new Date(Date.UTC(2026, 11, 1));
        expect(ageBucket('2008-12-01', dueDate)).toBe('adult');
        expect(ageBucket('2008-12-02', dueDate)).toBe('minor');
    });

    it('says unknown rather than guessing adult', () => {
        for (const value of [null, undefined, '', 'nope']) {
            expect(ageBucket(value, today)).toBe('unknown');
        }
    });
});
