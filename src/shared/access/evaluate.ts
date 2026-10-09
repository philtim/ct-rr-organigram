import { checkMembership } from './access.api';
import type { AccessRule } from './rules';

export type AccessOutcome =
    | { status: 'allowed'; matchedRoleId?: number }
    | { status: 'denied' }
    | { status: 'error'; httpStatus?: number };

/**
 * The single place an AccessRule is resolved (ADR-008).
 *
 * Fail closed: only a 404 denies. Every other failure — 403, 5xx, timeout,
 * network — yields `error`, so the user is told the check could not be
 * performed instead of being quietly turned away.
 */
export async function evaluateRule(rule: AccessRule, personId: number): Promise<AccessOutcome> {
    const result = await checkMembership(rule.groupId, personId);
    if (result.status === 'not-member') return { status: 'denied' };
    if (result.status === 'error') return { status: 'error', httpStatus: result.httpStatus };

    if (rule.requireActive && result.member && result.member.groupMemberStatus !== 'active') {
        return { status: 'denied' };
    }
    return { status: 'allowed', matchedRoleId: result.member?.groupTypeRoleId };
}
