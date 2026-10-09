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

function extractStatus(e: unknown): number | undefined {
    if (typeof e === 'object' && e !== null) {
        const maybe = e as { response?: { status?: number }; status?: number };
        return maybe.response?.status ?? maybe.status;
    }
    return undefined;
}
