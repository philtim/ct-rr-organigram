import { ct, withRetryOn429 } from '@/shared/api';
import { fetchActiveMembers } from '@/shared/groups.api';
import type { Group, GroupMember } from '@/shared/types';

/** Full group with role definitions and ChurchTools-computed member statistics. */
export async function getGroup(groupId: number): Promise<Group> {
    return await withRetryOn429(() =>
        ct.get<Group>(`/groups/${groupId}?include[]=memberStatistics&include[]=roles`),
    );
}

/** Active members of a group, with the person object inlined. */
export async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return await fetchActiveMembers<GroupMember>(groupId);
}
