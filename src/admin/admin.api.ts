import { fetchAllPages } from '@/shared/api';
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
