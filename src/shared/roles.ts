import { ct, withRetryOn429 } from '@/shared/api';

/**
 * One definition of "leader", shared by all three tabs.
 *
 * This used to carry a hardcoded list of role *names* — Mitarbeiter,
 * Teamhelfer, Organisator — because those are `participant` roles that the
 * authors' Stamm treats as MAs. That list described one installation and
 * would have made every other Stamm count wrong, silently, all the way into
 * its Jahresmeldung. The names are gone; the admin ticks role ids instead
 * (`Settings.extraLeaderRoleIds`).
 *
 * What ChurchTools itself flags as leadership counts unless the admin took it
 * out (`Settings.excludedLeaderRoleIds`). That half is stored as an exclusion
 * on purpose: a role added to the group type later is counted the day it
 * appears, rather than going missing until somebody notices the figures are
 * low.
 */

/** Which roles count as Mitarbeiter, as the admin configured it. */
export type LeaderRule = {
    /** Participant roles counted as Mitarbeiter. */
    extra: ReadonlySet<number>;
    /** Leadership roles not counted. */
    excluded: ReadonlySet<number>;
};

export function leaderRuleOf(settings: {
    extraLeaderRoleIds: readonly number[];
    excludedLeaderRoleIds: readonly number[];
}): LeaderRule {
    return {
        extra: new Set(settings.extraLeaderRoleIds),
        excluded: new Set(settings.excludedLeaderRoleIds),
    };
}

/** The role ids that count as leading — every tab classifies people by this one set. */
export type LeaderRoleIds = ReadonlySet<number>;

type RoleDefinition = {
    id: number;
    groupTypeId?: number;
    name?: string;
    type?: string;
    isLeader?: boolean;
};

/**
 * The shape both predicates accept — whatever carries a role's id, name and
 * flags, whether it came from a group's `roles` include (`groupTypeRoleId`)
 * or from `GET /group/roles` (`id`). The two are the same number space:
 * `groupTypeRoleId` is unique installation-wide.
 */
type RoleLike = {
    groupTypeRoleId?: number;
    id?: number;
    name?: string;
    type?: string;
    isLeader?: boolean;
};

/** The role's id, from whichever field the endpoint used. */
export function roleIdOf(role: RoleLike): number | null {
    if (typeof role.groupTypeRoleId === 'number') return role.groupTypeRoleId;
    if (typeof role.id === 'number') return role.id;
    return null;
}

/**
 * True for roles ChurchTools itself calls leadership. `type` is the current
 * field; `isLeader` is deprecated in the API spec but still delivered, so
 * either is accepted.
 */
export function isLeadershipRole(role: RoleLike): boolean {
    return role.type === 'leader' || role.isLeader === true;
}

/**
 * A role counts as leader iff ChurchTools flags it and the admin did not take
 * it out, or the admin added it to the extras.
 */
export function isLeaderRole(role: RoleLike, rule: LeaderRule): boolean {
    const id = roleIdOf(role);
    if (id !== null && rule.excluded.has(id)) return false;
    if (isLeadershipRole(role)) return true;
    return id !== null && rule.extra.has(id);
}

/** A leadership role the Stamm counts — what a card lists as a position. */
export function isCountedLeadershipRole(role: RoleLike, rule: LeaderRule): boolean {
    const id = roleIdOf(role);
    return isLeadershipRole(role) && !(id !== null && rule.excluded.has(id));
}

/**
 * Every role id that counts as a leader, across all group types, in one
 * request. `groupTypeRoleId` is unique installation-wide (33 definitions, no
 * collisions on live), so a flat set is enough and callers do not need each
 * group's own role list.
 */
export async function fetchLeaderRoleIds(rule: LeaderRule): Promise<LeaderRoleIds> {
    const roles = await withRetryOn429(() => ct.get<RoleDefinition[]>('/group/roles'));
    const ids = new Set<number>();
    for (const role of roles ?? []) {
        if (typeof role.id === 'number' && isLeaderRole(role, rule)) ids.add(role.id);
    }
    return ids;
}
