import { ct } from '@/shared/api';
import { LEADER_ROLE_NAMES } from '@/shared/constants';

/**
 * One definition of "leader", shared by both tabs.
 *
 * This used to live in `src/dashboard/counts.ts` and the Beitragsabrechnung
 * had its own, cruder rule: anything that is not `groupTypeRoleId === 8`.
 * The two agreed by luck — only Teilnehmer, Leiter, Co-Leiter and Mitarbeiter
 * are in use on the live instance. A Kleingruppe also defines **Coach** and
 * **Interessent**, both of which the organigram counts as members while the
 * other rule would have silently filed them under Mitarbeiter and exempted
 * them from the fee. Nobody holds those roles today, which is exactly why it
 * would have gone unnoticed until it did not.
 *
 * ADR-004's trigger for `shared/`: a second feature needs it.
 */
export type RoleDefinition = {
    id: number;
    groupTypeId?: number;
    name?: string;
    type?: string;
    isLeader?: boolean;
};

/** True for roles ChurchTools itself calls leadership. */
export function isLeadershipRole(role: { type?: string; isLeader?: boolean }): boolean {
    return role.type === 'leader' || role.isLeader === true;
}

/**
 * A role counts as leader iff ChurchTools flags it, or its name is in the
 * broadened set — Mitarbeiter, Teamhelfer and Organisator are `participant`
 * roles that the Stamm treats as MAs.
 */
export function isLeaderRole(role: { name?: string; type?: string; isLeader?: boolean }): boolean {
    if (isLeadershipRole(role)) return true;
    return LEADER_ROLE_NAMES.has((role.name ?? '').trim().toLowerCase());
}

/**
 * Every role id that counts as a leader, across all group types, in one
 * request. `groupTypeRoleId` is unique installation-wide (33 definitions, no
 * collisions on live), so a flat set is enough and callers do not need each
 * group's own role list.
 */
export async function fetchLeaderRoleIds(): Promise<Set<number>> {
    const roles = await ct.get<RoleDefinition[]>('/group/roles');
    const ids = new Set<number>();
    for (const role of roles ?? []) {
        if (typeof role.id === 'number' && isLeaderRole(role)) ids.add(role.id);
    }
    return ids;
}
