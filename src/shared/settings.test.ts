import { describe, expect, it } from 'vitest';
import {
    EMPTY_SETTINGS,
    shouldShowAdmin,
    areFeesConfigured,
    isDashboardConfigured,
    missingDashboardFields,
    parseSettings,
} from './settings';

/** What the live instance has stored today, before this change. */
const LEGACY = {
    gateGroupId: 950,
    teilstammIds: [1012, 80, 123, 129, 132],
    beitraegeRoleIds: [41, 42],
};

describe('parseSettings', () => {
    it('reads a complete object back unchanged', () => {
        const stored = {
            gateGroupId: 950,
            teilstammIds: [1012, 80],
            stammGroupTypeIds: [10],
            teamGroupTypeIds: [1],
            extraLeaderRoleIds: [15, 19],
            alwaysShownRoleIds: [41],
            horizontFieldName: 'Horizont',
            fees: { childCents: [8000, 6000, 0], staffCents: 0, juniorLeaderCents: 0 },
        };

        expect(parseSettings(stored)).toEqual(stored);
    });

    it('gives back the empty settings for anything unreadable', () => {
        for (const value of [null, undefined, 42, 'nope', [], { gateGroupId: 'x' }]) {
            expect(parseSettings(value)).toEqual(EMPTY_SETTINGS);
        }
    });

    describe('the object the live instance has stored today', () => {
        it('keeps the structure it already configured', () => {
            const settings = parseSettings(LEGACY);

            expect(settings.gateGroupId).toBe(950);
            expect(settings.teilstammIds).toEqual([1012, 80, 123, 129, 132]);
        });

        it('invents nothing for the fields that did not exist yet', () => {
            // The whole point of this change: no Stamm-specific default is
            // carried in the source. An unconfigured installation says so
            // rather than guessing the authors' own values.
            const settings = parseSettings(LEGACY);

            expect(settings.teamGroupTypeIds).toEqual([]);
            expect(settings.extraLeaderRoleIds).toEqual([]);
            expect(settings.alwaysShownRoleIds).toEqual([]);
            expect(settings.horizontFieldName).toBe('');
            expect(settings.fees.childCents).toEqual([]);
        });

        it('drops the role list the access model no longer has', () => {
            expect(parseSettings(LEGACY)).not.toHaveProperty('beitraegeRoleIds');
        });
    });

    describe('hostile input', () => {
        it('keeps only finite integers in the id lists', () => {
            const settings = parseSettings({
                gateGroupId: 950,
                teilstammIds: [1, '2', null, 3.5, NaN, Infinity, 4],
            });

            expect(settings.teilstammIds).toEqual([1, 4]);
        });

        it('refuses a non-numeric gate group', () => {
            expect(parseSettings({ gateGroupId: '950' }).gateGroupId).toBeNull();
        });

        it('trims the field name and treats blank as unset', () => {
            expect(parseSettings({ horizontFieldName: '  Horizont ' }).horizontFieldName).toBe(
                'Horizont',
            );
            expect(parseSettings({ horizontFieldName: '   ' }).horizontFieldName).toBe('');
        });

        it('keeps only non-negative integers in the fee ladder', () => {
            const settings = parseSettings({
                fees: { childCents: [8000, -1, 'x', 0], staffCents: -5, juniorLeaderCents: 2.5 },
            });

            expect(settings.fees.childCents).toEqual([8000, 0]);
            expect(settings.fees.staffCents).toBe(0);
            expect(settings.fees.juniorLeaderCents).toBe(0);
        });
    });
});

describe('isDashboardConfigured', () => {
    const complete = {
        ...EMPTY_SETTINGS,
        gateGroupId: 950,
        teilstammIds: [1012],
        teamGroupTypeIds: [1],
    };

    it('needs a gate group, a Teilstamm and a team type', () => {
        expect(isDashboardConfigured(complete)).toBe(true);
    });

    it.each([
        ['gateGroupId', { ...complete, gateGroupId: null }],
        ['teilstammIds', { ...complete, teilstammIds: [] }],
        ['teamGroupTypeIds', { ...complete, teamGroupTypeIds: [] }],
    ])('is not configured without %s', (_name, settings) => {
        expect(isDashboardConfigured(settings)).toBe(false);
    });

    it('names what is missing, so the hint can say it', () => {
        expect(missingDashboardFields(EMPTY_SETTINGS)).toEqual([
            'gateGroupId',
            'teilstammIds',
            'teamGroupTypeIds',
        ]);
        expect(missingDashboardFields(complete)).toEqual([]);
    });

    it('treats the empty optional fields as a valid configuration', () => {
        // A Stamm where only ChurchTools' own leader roles count, with no
        // Horizont field and no vacancies on show, is fully configured.
        expect(isDashboardConfigured(complete)).toBe(true);
        expect(complete.extraLeaderRoleIds).toEqual([]);
        expect(complete.horizontFieldName).toBe('');
    });
});

describe('areFeesConfigured', () => {
    it('needs at least one rung on the ladder', () => {
        const settings = {
            ...EMPTY_SETTINGS,
            fees: { ...EMPTY_SETTINGS.fees, childCents: [8000] },
        };

        expect(areFeesConfigured(settings)).toBe(true);
        expect(areFeesConfigured(EMPTY_SETTINGS)).toBe(false);
    });

    it('accepts a ladder that is free all the way down', () => {
        // Odd, but a Stamm that charges nothing is configured, not broken.
        const settings = { ...EMPTY_SETTINGS, fees: { ...EMPTY_SETTINGS.fees, childCents: [0] } };

        expect(areFeesConfigured(settings)).toBe(true);
    });
});

describe('shouldShowAdmin', () => {
    const base = {
        loadFailed: false,
        hasGateGroup: true,
        configured: true,
        gateAllowed: true,
        isAdminRoute: false,
    };

    it('shows the form on a genuine first run, without a gate', () => {
        // Nothing to check membership against; requiring it would lock
        // everybody out permanently.
        expect(
            shouldShowAdmin({
                ...base,
                hasGateGroup: false,
                configured: false,
                gateAllowed: false,
            }),
        ).toBe(true);
    });

    it('does not show it when the configuration could not be read', () => {
        // The dangerous case: a 5xx looks like "nothing configured", and a
        // save would overwrite a configuration that still exists.
        expect(
            shouldShowAdmin({ ...base, loadFailed: true, hasGateGroup: false, configured: false }),
        ).toBe(false);
        expect(shouldShowAdmin({ ...base, loadFailed: true })).toBe(false);
    });

    it('gates a half-configured installation', () => {
        // A Hauptstamm exists, so membership can be checked — and must be.
        expect(shouldShowAdmin({ ...base, configured: false, gateAllowed: false })).toBe(false);
        expect(shouldShowAdmin({ ...base, configured: false, gateAllowed: true })).toBe(true);
    });

    it('gates ?admin=1 as well', () => {
        expect(shouldShowAdmin({ ...base, isAdminRoute: true, gateAllowed: false })).toBe(false);
        expect(shouldShowAdmin({ ...base, isAdminRoute: true, gateAllowed: true })).toBe(true);
    });

    it('stays out of the way once everything is configured', () => {
        expect(shouldShowAdmin(base)).toBe(false);
    });
});
