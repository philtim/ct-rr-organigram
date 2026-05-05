import { ct } from '@/shared/api';
import type { Group, GroupMember } from '@/shared/types';

/**
 * Shape of items returned by GET /groups/{id}/children — these are
 * "domain objects", not full Group objects (recon-confirmed):
 *   { title, domainIdentifier (numeric STRING), domainAttributes.groupTypeId, ... }
 */
export type GroupChild = {
    title: string;
    domainIdentifier: string;
    domainAttributes: { groupTypeId: number };
};

export async function getGroupChildren(groupId: number): Promise<GroupChild[]> {
    return await ct.get<GroupChild[]>(`/groups/${groupId}/children`);
}

/** Full group with role definitions and ChurchTools-computed member statistics. */
export async function getGroup(groupId: number): Promise<Group> {
    return await ct.get<Group>(`/groups/${groupId}?include[]=memberStatistics&include[]=roles`);
}

/** Members of a group (inlined person object — no extra /persons calls needed). */
export async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return await ct.get<GroupMember[]>(`/groups/${groupId}/members?limit=200`);
}
