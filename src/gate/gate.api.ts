import { ct } from '@/shared/api';
import type { Person } from '@/shared/types';

export async function whoami(): Promise<Person> {
    return await ct.get<Person>('/whoami');
}

export type MembershipResult =
    | { status: 'member' }
    | { status: 'not-member' }
    | { status: 'error'; httpStatus?: number };

/**
 * Recon-confirmed gate-membership endpoint:
 *   GET /api/groups/{groupId}/members/{personId}
 *     200 → person is a member
 *     404 → person is not a member (response message: error.notfound)
 * Anything else (5xx, 403, network) is treated as an error so the user
 * gets a clear "couldn't verify" instead of a silent denial.
 */
export async function checkMembership(
    groupId: number,
    personId: number,
): Promise<MembershipResult> {
    try {
        await ct.get(`/groups/${groupId}/members/${personId}`);
        return { status: 'member' };
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
