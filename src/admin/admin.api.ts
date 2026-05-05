import { ct } from '@/shared/api';
import type { Group } from '@/shared/types';

/**
 * List all groups visible to the current user. Used to populate the
 * Hauptstamm picker (US-2). The /groups endpoint paginates at 200 items
 * per page; v1 doesn't worry about pagination because in any realistic
 * RR installation the picker fits comfortably under that.
 */
export async function listGroups(): Promise<Group[]> {
    return await ct.get<Group[]>('/groups?limit=200');
}
