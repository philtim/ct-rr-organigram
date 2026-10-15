/**
 * The admin screen's rules, as pure functions: which groups and roles to
 * offer, how to label them, and what the current selection would cover.
 */
import type { ChildGroup, GroupTypeRef, PickableRole, ScopeScan } from './admin.api';
import { COPY } from '@/shared/copy';
import type { Group } from '@/shared/types';

const byName = (a: string, b: string) => a.localeCompare(b, 'de');

/** Groups matching a search by name or id, alphabetically, at most `limit`. */
export function searchGroups(groups: Group[], query: string, limit = 50): Group[] {
    const q = query.trim().toLocaleLowerCase('de');
    return groups
        .filter((g) => !q || g.name.toLocaleLowerCase('de').includes(q) || String(g.id).includes(q))
        .sort((a, b) => byName(a.name, b.name))
        .slice(0, limit);
}

/**
 * Which group types the Teilstamm picker offers: the configured ones, or the
 * Hauptstamm's own type until somebody chooses.
 */
export function stammTypeIds(configured: number[], hauptstamm: Group | undefined): number[] {
    if (configured.length) return configured;
    const own = hauptstamm?.information?.groupTypeId;
    return own === undefined ? [] : [own];
}

/**
 * Children of the Hauptstamm of the given types — the normal Teilstamm case.
 * With no type to go by, every child is offered: there are few of them, and
 * hiding all would leave nothing to pick.
 */
export function childCandidates(children: ChildGroup[], typeIds: number[]): ChildGroup[] {
    const types = new Set(typeIds);
    return children
        .filter((c) => types.size === 0 || types.has(c.groupTypeId))
        .sort((a, b) => byName(a.title, b.title));
}

/**
 * Every other group of the given types — for a Stamm whose structure is flat,
 * or one that names the Hauptstamm itself as its only Teilstamm. Unlike the
 * children, no type means nothing offered: "every group in the installation"
 * is not a list anyone can pick from.
 */
export function otherCandidates(
    groups: Group[],
    children: ChildGroup[],
    typeIds: number[],
): Group[] {
    const types = new Set(typeIds);
    const childIds = new Set(children.map((c) => c.id));
    return groups
        .filter((g) => {
            const type = g.information?.groupTypeId;
            return !childIds.has(g.id) && type !== undefined && types.has(type);
        })
        .sort((a, b) => byName(a.name, b.name));
}

export type TypeCount = { id: number; name: string; count: number };

/** The group types found under the chosen Teilstämme, most frequent first. */
export function childTypeCounts(children: ChildGroup[], types: GroupTypeRef[]): TypeCount[] {
    const names = new Map(types.map((t) => [t.id, t.name]));
    const counts = new Map<number, number>();
    for (const child of children) {
        counts.set(child.groupTypeId, (counts.get(child.groupTypeId) ?? 0) + 1);
    }
    return [...counts.entries()]
        .map(([id, count]) => ({ id, count, name: names.get(id) ?? `Typ ${id}` }))
        .sort((a, b) => b.count - a.count);
}

export type LabelledRole = PickableRole & { label: string };

/**
 * The roles that can occur in the given group types, labelled so each can be
 * told apart.
 *
 * `GET /group/roles` returns one definition *per group type*, so an
 * installation with four types offers four roles called "Leiter". Narrowing to
 * the types in play removes most of that; a name that still repeats gets its
 * type appended, because two roles of the same name in two types are
 * genuinely different roles and the admin has to pick the right one.
 */
export function rolesInScope(
    roles: PickableRole[],
    typeIds: number[],
    types: GroupTypeRef[],
): LabelledRole[] {
    const inTypes = new Set(typeIds);
    const typeNames = new Map(types.map((t) => [t.id, t.name]));
    const inScope = roles.filter((r) => r.groupTypeId !== null && inTypes.has(r.groupTypeId));

    const nameCounts = new Map<string, number>();
    for (const role of inScope) nameCounts.set(role.name, (nameCounts.get(role.name) ?? 0) + 1);

    return inScope
        .map((role) => ({
            ...role,
            label:
                (nameCounts.get(role.name) ?? 0) > 1
                    ? `${role.name} (${typeNames.get(role.groupTypeId ?? -1) ?? '?'})`
                    : role.name,
        }))
        .sort((a, b) => byName(a.label, b.label));
}

/** The two stored lists behind "Wer ist Mitarbeiter?". */
export type RoleSelection = { extraLeaderRoleIds: number[]; excludedLeaderRoleIds: number[] };

/** The roles on screen that count as Mitarbeiter under a stored selection. */
export function tickedRoleIds(roles: PickableRole[], selection: RoleSelection): number[] {
    const excluded = new Set(selection.excludedLeaderRoleIds);
    const extra = new Set(selection.extraLeaderRoleIds);
    return roles
        .filter((r) => (r.isLeadership ? !excluded.has(r.id) : extra.has(r.id)))
        .map((r) => r.id);
}

/**
 * The stored selection after the admin ticked `ticked` among `roles`.
 *
 * Leadership is stored as what was taken out and everything else as what was
 * added, so a leadership role ChurchTools gains later counts and a new
 * participant role does not. Ids of roles not on screen are kept as they are:
 * another Teilstamm's type may come back into scope.
 */
export function applyTickedRoles(
    roles: PickableRole[],
    ticked: number[],
    selection: RoleSelection,
): RoleSelection {
    const isTicked = new Set(ticked);
    const onScreen = new Set(roles.map((r) => r.id));
    const offScreen = (ids: number[]) => ids.filter((id) => !onScreen.has(id));
    return {
        excludedLeaderRoleIds: [
            ...offScreen(selection.excludedLeaderRoleIds),
            ...roles.filter((r) => r.isLeadership && !isTicked.has(r.id)).map((r) => r.id),
        ],
        extraLeaderRoleIds: [
            ...offScreen(selection.extraLeaderRoleIds),
            ...roles.filter((r) => !r.isLeadership && isTicked.has(r.id)).map((r) => r.id),
        ],
    };
}

/** How many people in scope hold a given role. Drives the hints in the picker. */
export function personsWithRole(scan: ScopeScan, roleId: number): number {
    let count = 0;
    for (const held of scan.rolesByPerson.values()) if (held.has(roleId)) count += 1;
    return count;
}

/** The teams the current selection would cover. */
export function teamsInScope(scan: ScopeScan, teamGroupTypeIds: number[]): ChildGroup[] {
    const types = new Set(teamGroupTypeIds);
    return scan.children.filter((c) => types.has(c.groupTypeId));
}

/** Unique people the current selection would cover. The preview line. */
export function personsInScope(
    scan: ScopeScan,
    gateGroupId: number | null,
    teilstammIds: number[],
    teamGroupTypeIds: number[],
): number {
    const groupIds = [
        ...(gateGroupId === null ? [] : [gateGroupId]),
        ...teilstammIds,
        ...teamsInScope(scan, teamGroupTypeIds).map((c) => c.id),
    ];
    const persons = new Set<number>();
    for (const id of groupIds) {
        for (const personId of scan.personsByGroup.get(id) ?? []) persons.add(personId);
    }
    return persons.size;
}

/** The label a fee rung carries. The last one applies to every further child. */
export function rungLabel(index: number, total: number): string {
    // The last rung always reads "ab N", a single-rung ladder included: it
    // applies to every further child either way, and saying "1. Kind" would
    // promise a rate that stops there.
    return index === total - 1 ? COPY.adminRungFrom(index + 1) : COPY.adminRung(index + 1);
}

/** Euro with two decimals and a German comma, from exact cents — what a fee input shows. */
export function toEuro(cents: number): string {
    return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Exact cents from what was typed. Comma or point as the decimal mark; with
 * both, as in "1.234,50", the point is a thousands separator. A trailing "€"
 * is ignored. Anything unusable is 0.
 */
export function fromEuro(value: string): number {
    let text = value.replace(/€/g, '').replace(/\s+/g, '');
    if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
    if (!/^\d*\.?\d*$/.test(text) || !/\d/.test(text)) return 0;
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}
