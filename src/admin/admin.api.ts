import { ct, fetchAllPages } from '@/shared/api';
import type { Group } from '@/shared/types';

/**
 * List all groups visible to the current user. Used to populate the
 * Hauptstamm picker (US-2). Real ChurchTools instances have well over
 * the /groups page cap (200), so we paginate; the picker filters
 * client-side so the network cost is paid once at open time.
 */
export async function listGroups(): Promise<Group[]> {
    return await fetchAllPages<Group>('/groups', { limit: 200 });
}

/** Re-export so the Teilstamm picker can list a Hauptstamm's direct children. */
export { getGroupChildren } from '@/dashboard/dashboard.api';
export type { GroupChild } from '@/dashboard/dashboard.api';

/** One selectable role of the Hauptstamm group, as the roles include returns it. */
export type PickableRole = {
    groupTypeRoleId: number;
    name: string;
    isActive: boolean;
    sortKey: number;
};

/**
 * The Hauptstamm group's role definitions, for the Beitragsabrechnung role
 * picker (ADR-008: role IDs come from configuration, never hardcoded names).
 *
 * Deliberately its own call rather than reusing `getGroup` from the dashboard:
 * that one also pulls memberStatistics, which this picker has no use for.
 * ADR-004 permits similar-but-not-identical calls to live side by side.
 */
export async function getGroupRoles(groupId: number): Promise<PickableRole[]> {
    const group = await ct.get<{ roles?: PickableRole[] }>(`/groups/${groupId}?include[]=roles`);
    return group?.roles ?? [];
}
