/**
 * Declarative access rules (ADR-008). Each view declares the rule it needs;
 * `evaluateRule` in ./evaluate.ts is the single place that resolves one.
 *
 * Deliberately only two variants. An `{ kind: 'any'; rules: AccessRule[] }`
 * combinator was designed and left out until a view actually needs it —
 * see ADR-008, "What we'd reconsider for".
 */
export type AccessRule =
    | {
          kind: 'membership';
          groupId: number;
          /**
           * Require `groupMemberStatus === 'active'`. Off by default because
           * the pre-ADR-008 gate never checked it, and the organigram must
           * keep behaving exactly as it did (ADR-008, Decision).
           */
          requireActive?: boolean;
      }
    | {
          kind: 'role';
          groupId: number;
          /** `groupTypeRoleId`s, configured by the admin — never hardcoded names. */
          roleIds: number[];
      };

/** Build the organigram's rule, or null when nothing is configured yet (US-2). */
export function membershipRule(groupId: number | null | undefined): AccessRule | null {
    return typeof groupId === 'number' ? { kind: 'membership', groupId } : null;
}

/**
 * Build a role rule, or null when group or roles are unconfigured. Null means
 * the view is unavailable, not that access is granted — an unconfigured
 * Beitragsabrechnung must stay shut, not stand open.
 */
export function roleRule(
    groupId: number | null | undefined,
    roleIds: number[] | null | undefined,
): AccessRule | null {
    if (typeof groupId !== 'number') return null;
    if (!Array.isArray(roleIds) || roleIds.length === 0) return null;
    return { kind: 'role', groupId, roleIds };
}
