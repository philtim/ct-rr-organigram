import { describe, expect, it } from 'vitest';
import { isLeaderRole, isLeadershipRole } from './roles';

/**
 * The role names are the live instance's; the point of these cases is that
 * both tabs answer "is this a leader?" identically, especially for the roles
 * nobody holds yet.
 */
describe('isLeaderRole', () => {
    it('accepts what ChurchTools itself flags as leadership', () => {
        expect(isLeaderRole({ name: 'Leiter', type: 'leader' })).toBe(true);
        expect(isLeaderRole({ name: 'Co-Leiter', type: 'leader' })).toBe(true);
        expect(isLeaderRole({ name: 'Hauptstammleiter', type: 'leader' })).toBe(true);
    });

    it('accepts the deprecated isLeader flag when type is absent', () => {
        expect(isLeaderRole({ name: 'Stammwart', isLeader: true })).toBe(true);
    });

    it('accepts the broadened names the Stamm treats as MAs', () => {
        // `participant` roles in ChurchTools, leaders in practice.
        expect(isLeaderRole({ name: 'Mitarbeiter', type: 'participant' })).toBe(true);
        expect(isLeaderRole({ name: 'Teamhelfer', type: 'participant' })).toBe(true);
        expect(isLeaderRole({ name: 'Organisator', type: 'participant' })).toBe(true);
    });

    it('is not fooled by case or stray whitespace', () => {
        expect(isLeaderRole({ name: '  MITARBEITER ', type: 'participant' })).toBe(true);
    });

    it('rejects Teilnehmer', () => {
        expect(isLeaderRole({ name: 'Teilnehmer', type: 'participant' })).toBe(false);
    });

    it('rejects Coach and Interessent', () => {
        // The regression this module exists for: the Beitragsabrechnung used
        // to treat everything that was not role 8 as a Mitarbeiter, which
        // would have exempted these two from the fee while the organigram
        // counted them as members. Nobody holds them today.
        expect(isLeaderRole({ name: 'Coach', type: 'participant' })).toBe(false);
        expect(isLeaderRole({ name: 'Interessent', type: 'participant' })).toBe(false);
    });

    it('rejects a role with no name and no flags', () => {
        expect(isLeaderRole({})).toBe(false);
    });
});

describe('isLeadershipRole', () => {
    it('is narrower than isLeaderRole — only what ChurchTools calls leadership', () => {
        expect(isLeadershipRole({ name: 'Mitarbeiter', type: 'participant' })).toBe(false);
        expect(isLeadershipRole({ name: 'Leiter', type: 'leader' })).toBe(true);
    });
});
