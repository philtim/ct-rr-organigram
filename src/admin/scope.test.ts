import { describe, expect, it } from 'vitest';
import {
    applyTickedRoles,
    childCandidates,
    childTypeCounts,
    fromEuro,
    otherCandidates,
    personsInScope,
    personsWithRole,
    rolesInScope,
    rungLabel,
    searchGroups,
    stammTypeIds,
    tickedRoleIds,
    toEuro,
} from './scope';
import type { ChildGroup, ScopeScan } from './admin.api';
import type { Group } from '@/shared/types';

const group = (id: number, name: string, groupTypeId?: number): Group => ({
    id,
    name,
    information: groupTypeId === undefined ? undefined : { groupTypeId },
});
const child = (id: number, title: string, groupTypeId: number): ChildGroup => ({
    id,
    title,
    groupTypeId,
    teilstammId: 1,
});

describe('searchGroups', () => {
    const groups = [group(3, 'Stamm Süd'), group(12, 'Stamm Nord'), group(5, 'Chor')];

    it('matches name or id, case-insensitively, sorted by name', () => {
        expect(searchGroups(groups, 'stamm').map((g) => g.id)).toEqual([12, 3]);
        expect(searchGroups(groups, '12').map((g) => g.id)).toEqual([12]);
    });

    it('caps the result', () => {
        expect(searchGroups(groups, '', 2)).toHaveLength(2);
    });
});

describe('stammTypeIds', () => {
    it('prefers the configured types', () => {
        expect(stammTypeIds([4], group(1, 'H', 9))).toEqual([4]);
    });

    it("falls back to the Hauptstamm's own type, or to nothing", () => {
        expect(stammTypeIds([], group(1, 'H', 9))).toEqual([9]);
        expect(stammTypeIds([], group(1, 'H'))).toEqual([]);
        expect(stammTypeIds([], undefined)).toEqual([]);
    });
});

describe('childCandidates / otherCandidates', () => {
    const children = [child(10, 'Süd', 4), child(11, 'Nord', 4), child(12, 'Kasse', 7)];

    it('offers the children of the Teilstamm types, by name', () => {
        expect(childCandidates(children, [4]).map((c) => c.id)).toEqual([11, 10]);
    });

    it('offers every child when there is no type to go by', () => {
        expect(childCandidates(children, [])).toHaveLength(3);
    });

    it('offers other groups of the types, but none without a type', () => {
        const groups = [group(10, 'Süd', 4), group(20, 'Extern', 4), group(21, 'X', 7)];
        expect(otherCandidates(groups, children, [4]).map((g) => g.id)).toEqual([20]);
        expect(otherCandidates(groups, children, [])).toEqual([]);
    });
});

describe('childTypeCounts', () => {
    it('counts the types found, most frequent first, naming unknown ones by id', () => {
        const children = [child(1, 'a', 4), child(2, 'b', 7), child(3, 'c', 7)];
        expect(childTypeCounts(children, [{ id: 7, name: 'Team' }])).toEqual([
            { id: 7, count: 2, name: 'Team' },
            { id: 4, count: 1, name: 'Typ 4' },
        ]);
    });
});

describe('rolesInScope', () => {
    const types = [
        { id: 1, name: 'Teilstamm' },
        { id: 2, name: 'Team' },
    ];
    const role = (id: number, name: string, groupTypeId: number | null) => ({
        id,
        name,
        groupTypeId,
        isLeadership: false,
    });

    it('keeps only roles of the types in play, and disambiguates repeated names', () => {
        const roles = [
            role(1, 'Leiter', 1),
            role(2, 'Leiter', 2),
            role(3, 'Kassierer', 2),
            role(4, 'Leiter', 9),
            role(5, 'Gast', null),
        ];
        expect(rolesInScope(roles, [1, 2], types).map((r) => [r.id, r.label])).toEqual([
            [3, 'Kassierer'],
            [2, 'Leiter (Team)'],
            [1, 'Leiter (Teilstamm)'],
        ]);
    });
});

describe('scope counts', () => {
    const scan: ScopeScan = {
        children: [child(10, 'T1', 4), child(11, 'Kasse', 7)],
        rolesByPerson: new Map([
            [1, new Set([8])],
            [2, new Set([8, 9])],
            [3, new Set([9])],
        ]),
        personsByGroup: new Map([
            [100, new Set([1])],
            [1, new Set([2])],
            [10, new Set([2, 3])],
            [11, new Set([4])],
        ]),
        checkboxFieldNames: [],
        fieldsIncomplete: false,
        incomplete: false,
    };

    it('counts the holders of a role', () => {
        expect(personsWithRole(scan, 8)).toBe(2);
        expect(personsWithRole(scan, 99)).toBe(0);
    });

    it('counts unique people across Hauptstamm, Teilstämme and team-typed children', () => {
        expect(personsInScope(scan, 100, [1], [4])).toBe(3);
        expect(personsInScope(scan, 100, [1], [4, 7])).toBe(4);
        expect(personsInScope(scan, null, [], [])).toBe(0);
    });
});

describe('fee input', () => {
    it('round-trips euro and cents exactly', () => {
        expect(toEuro(8050)).toBe('80,50');
        expect(toEuro(0)).toBe('0,00');
        expect(fromEuro(toEuro(12345))).toBe(12345);
        expect(fromEuro('80,5')).toBe(8050);
        expect(fromEuro('0.10')).toBe(10);
    });

    it('turns anything unusable into 0, never a negative fee', () => {
        expect(fromEuro('')).toBe(0);
        expect(fromEuro('abc')).toBe(0);
        expect(fromEuro('-5')).toBe(0);
        expect(fromEuro('12abc')).toBe(0);
    });

    it('reads what people type into a German money field', () => {
        expect(fromEuro('80')).toBe(8000);
        expect(fromEuro('80 €')).toBe(8000);
        expect(fromEuro('1.234,50')).toBe(123450);
        expect(fromEuro(' 60,00 ')).toBe(6000);
    });

    it('labels the last rung as applying to every further child', () => {
        expect([0, 1, 2].map((i) => rungLabel(i, 3))).toEqual(['1. Kind', '2. Kind', 'ab 3. Kind']);
        expect(rungLabel(0, 1)).toBe('ab 1. Kind');
    });
});

describe('the Mitarbeiter role list', () => {
    const role = (id: number, isLeadership: boolean) => ({
        id,
        name: `Rolle ${id}`,
        groupTypeId: 2,
        isLeadership,
    });
    // 16 Leiter, 17 Co-Leiter (leadership); 15 Mitarbeiter, 38 Teilnehmer.
    const roles = [role(16, true), role(17, true), role(15, false), role(38, false)];
    const none = { extraLeaderRoleIds: [], excludedLeaderRoleIds: [] };

    it('arrives with the leadership roles ticked and the rest unticked', () => {
        expect(tickedRoleIds(roles, none)).toEqual([16, 17]);
    });

    it('stores an unticked leadership role as excluded and a ticked participant role as extra', () => {
        expect(applyTickedRoles(roles, [16, 15], none)).toEqual({
            excludedLeaderRoleIds: [17],
            extraLeaderRoleIds: [15],
        });
    });

    it('reads back what it stored', () => {
        const stored = applyTickedRoles(roles, [16, 15], none);
        expect(tickedRoleIds(roles, stored)).toEqual([16, 15]);
    });

    it('keeps ids of roles that are not on screen', () => {
        const stored = { extraLeaderRoleIds: [99], excludedLeaderRoleIds: [98] };
        expect(applyTickedRoles(roles, [16, 17], stored)).toEqual({
            excludedLeaderRoleIds: [98],
            extraLeaderRoleIds: [99],
        });
    });
});
