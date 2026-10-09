import { describe, expect, it } from 'vitest';
import { ageAt, nextDueDate, parseIsoDate } from './dates';

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
