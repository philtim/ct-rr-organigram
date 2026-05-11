import { LEADER_ROLE_NAMES } from '@/shared/constants';
import type { Group, GroupMember, Leader, LeaderClass, Participant } from '@/shared/types';

/**
 * Filter members to those whose role counts as a "leader" for the
 * Leiter stat tile. A role counts when ChurchTools flags it isLeader=true
 * OR its (lowercased) name matches one of the broadened role names
 * (Mitarbeiter / Teamhelfer / Organisator) — needed to align the count
 * with the "RR Mitarbeiter" auto-group on the live instance, whose rule
 * treats those non-isLeader roles as MAs.
 *
 * Each returned Leader carries its display class so the cards can split
 * them into Leiter / Co-Leiter pills (and silently keep "support" roles
 * in the count without showing them as pills).
 */
export function leadersFromMembers(group: Group, members: GroupMember[]): Leader[] {
    const roles = group.roles ?? [];
    const classByRoleId = new Map<number, LeaderClass>();
    for (const r of roles) {
        if (isLeaderRole(r)) {
            classByRoleId.set(r.groupTypeRoleId, classifyRole(r.name));
        }
    }

    return members
        .filter((m) => classByRoleId.has(m.groupTypeRoleId))
        .map((m) => {
            const personId = personIdOf(m);
            return {
                personId,
                fullName: m.person?.title ?? '',
                initials: deriveInitials(m),
                imageUrl: imageUrlOf(m),
                leaderClass: classByRoleId.get(m.groupTypeRoleId) ?? 'primary',
            };
        });
}

/** A role counts as leader iff CT flags it OR its name is in the broadened set. */
function isLeaderRole(role: { name?: string; isLeader?: boolean }): boolean {
    if (role.isLeader === true) return true;
    return LEADER_ROLE_NAMES.has((role.name ?? '').trim().toLowerCase());
}

/** Pull the person's profile-picture URL from the member's inlined person object. */
function imageUrlOf(m: GroupMember): string | null {
    const url = (m.person as unknown as { imageUrl?: string | null } | undefined)?.imageUrl;
    return typeof url === 'string' && url.length > 0 ? url : null;
}

/**
 * Return non-leader members with their personId and name — the rank-
 * and-file participants. "Leader" here uses the same broadened filter
 * as `leadersFromMembers`, so a Mitarbeiter/Teamhelfer/Organisator is
 * not double-classified into participants.
 *
 * Note: a person can still appear here for group A and as a leader for
 * group B in the same load — the per-Teilstamm and Hauptstamm
 * aggregations in `hierarchy.ts` resolve that by giving leader status
 * precedence over participant status across the tree.
 */
export function participantsFromMembers(group: Group, members: GroupMember[]): Participant[] {
    const roles = group.roles ?? [];
    const leaderRoleIds = new Set(
        roles.filter((r) => isLeaderRole(r)).map((r) => r.groupTypeRoleId),
    );
    return members
        .filter((m) => !leaderRoleIds.has(m.groupTypeRoleId))
        .map((m) => ({ personId: personIdOf(m), fullName: m.person?.title ?? '' }));
}

function personIdOf(m: GroupMember): number {
    const idStr = m.person?.domainIdentifier;
    return idStr != null ? parseInt(idStr, 10) : (m.personId ?? 0);
}

/**
 * Map a role name to its display bucket. Inclusion is decided upstream
 * by `isLeaderRole`; this routine only decides which sub-group the
 * leader lands in for display.
 *   "Co-Leiter"                            → coLeader (own pill section)
 *   "Mitarbeiter" / "Teamhelfer" / "Organisator" → support (counted only)
 *   everything else                        → primary  (Leiter pill / Stammleiter list)
 */
function classifyRole(roleName: string | undefined): LeaderClass {
    const normalized = (roleName ?? '').trim().toLowerCase();
    if (normalized === 'co-leiter' || normalized === 'coleiter') return 'coLeader';
    if (normalized === 'mitarbeiter' || normalized === 'teamhelfer' || normalized === 'organisator')
        return 'support';
    return 'primary';
}

/**
 * Use the API-provided initials when available; otherwise fall back to
 * first letters of first/last name.
 */
function deriveInitials(member: GroupMember): string {
    const inlinedInitials = (member.person as unknown as { initials?: string } | undefined)
        ?.initials;
    if (inlinedInitials) return inlinedInitials;
    const attrs = member.person?.domainAttributes as
        | { firstName?: string; lastName?: string }
        | undefined;
    const f = attrs?.firstName?.[0] ?? '';
    const l = attrs?.lastName?.[0] ?? '';
    return `${f}${l}`.toUpperCase();
}

/**
 * Sum a numeric field across an array of nodes.
 * Used to roll counts up from teams to teilstamm to hauptstamm.
 */
export function sumBy<T>(items: T[], field: (item: T) => number): number {
    return items.reduce((acc, item) => acc + field(item), 0);
}
