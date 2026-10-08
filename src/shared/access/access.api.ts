import { ct } from '@/shared/api';
import type { GroupMember, Person } from '@/shared/types';

/** Raw `/whoami`. Prefer `currentPerson()` so two views don't call it twice. */
export async function whoami(): Promise<Person> {
    return await ct.get<Person>('/whoami');
}

let cachedPerson: Person | null = null;

/**
 * The logged-in person, fetched once per page load. Each view evaluates its
 * own access rule (ADR-008), and they all need the same person id.
 */
export async function currentPerson(): Promise<Person> {
    if (cachedPerson) return cachedPerson;
    cachedPerson = await whoami();
    return cachedPerson;
}

/** Test seam / explicit reset after a login change. */
export function resetCurrentPerson(): void {
    cachedPerson = null;
}

export type MembershipResult =
    | { status: 'member'; member: GroupMember | null }
    | { status: 'not-member' }
    | { status: 'error'; httpStatus?: number };

/**
 * Recon-confirmed gate-membership endpoint:
 *   GET /api/groups/{groupId}/members/{personId}
 *     200 → person is a member
 *     404 → person is not a member (response message: error.notfound)
 * Anything else (5xx, 403, network) is treated as an error so the user
 * gets a clear "couldn't verify" instead of a silent denial.
 *
 * The 200 body is a GroupMember carrying `groupTypeRoleId` and
 * `groupMemberStatus`; it used to be discarded. It is returned here so a
 * caller can apply `requireActive` without a second request.
 */
export async function checkMembership(
    groupId: number,
    personId: number,
): Promise<MembershipResult> {
    try {
        const member = await ct.get<GroupMember>(`/groups/${groupId}/members/${personId}`);
        return { status: 'member', member: member ?? null };
    } catch (e: unknown) {
        const httpStatus = extractStatus(e);
        if (httpStatus === 404) return { status: 'not-member' };
        return { status: 'error', httpStatus };
    }
}

export type RoleResult =
    | { status: 'match'; roleId: number }
    | { status: 'no-match' }
    | { status: 'error'; httpStatus?: number };

/**
 * Role check in a single request — the list endpoint filters server-side:
 *   GET /api/groups/{groupId}/members
 *       ?person_id[]={personId}&role_ids[]=…&group_member_statuses[]=active
 * A non-empty result means the person holds one of the roles.
 *
 * An empty `roleIds` would drop the filter and match any membership, so it
 * is treated as "no role can match" rather than silently widening access.
 */
export async function checkRole(
    groupId: number,
    personId: number,
    roleIds: number[],
): Promise<RoleResult> {
    if (roleIds.length === 0) return { status: 'no-match' };

    const params = new URLSearchParams();
    params.append('person_id[]', String(personId));
    for (const roleId of roleIds) params.append('role_ids[]', String(roleId));
    params.append('group_member_statuses[]', 'active');

    try {
        const rows = await ct.get<GroupMember[]>(`/groups/${groupId}/members?${params}`);
        const match = rows?.[0];
        return match ? { status: 'match', roleId: match.groupTypeRoleId } : { status: 'no-match' };
    } catch (e: unknown) {
        return { status: 'error', httpStatus: extractStatus(e) };
    }
}

function extractStatus(e: unknown): number | undefined {
    if (typeof e === 'object' && e !== null) {
        const maybe = e as { response?: { status?: number }; status?: number };
        return maybe.response?.status ?? maybe.status;
    }
    return undefined;
}
