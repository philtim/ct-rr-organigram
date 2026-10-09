/**
 * Declarative access rules (ADR-008). Each view declares the rule it needs;
 * `evaluateRule` in ./evaluate.ts is the single place that resolves one.
 *
 * Down to one variant. The `role` rule existed so the Beitragsabrechnung
 * could be narrower than the organigram; who may open the extension at all is
 * now the ChurchTools admin's call, through the custom module's own `view`
 * permission, and the extension no longer second-guesses it. The `any`
 * combinator ADR-008 left out was never needed either.
 */
export type AccessRule = {
    kind: 'membership';
    groupId: number;
    /**
     * Require `groupMemberStatus === 'active'`. Off by default because the
     * pre-ADR-008 gate never checked it, and the organigram must keep
     * behaving exactly as it did (ADR-008, Decision).
     */
    requireActive?: boolean;
};

/** Build the organigram's rule, or null when nothing is configured yet (US-2). */
export function membershipRule(groupId: number | null | undefined): AccessRule | null {
    return typeof groupId === 'number' ? { kind: 'membership', groupId } : null;
}
