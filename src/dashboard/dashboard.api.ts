import { fetchActiveMembers } from '@/shared/groups.api';
import type { GroupMember } from '@/shared/types';

// Lives in shared/ since the admin's Änderungsprotokoll reads groups too (ADR-004).
export { getGroup } from '@/shared/groups.api';

/** Active members of a group, with the person object inlined. */
export async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return await fetchActiveMembers<GroupMember>(groupId);
}
