import type { Group, GroupMember, Leader, LeaderClass } from '@/shared/types';

/**
 * Filter members to those whose role on the group has isLeader=true.
 * Tags each leader with their role class so the Hauptstamm hero card
 * can split them into the "Leiter" / "Co-Leiter" buckets.
 */
export function leadersFromMembers(group: Group, members: GroupMember[]): Leader[] {
    const roles = group.roles ?? [];
    const leaderRoles = roles.filter((r) => r.isLeader === true);
    const classByRoleId = new Map<number, LeaderClass>();
    for (const r of leaderRoles) {
        classByRoleId.set(r.groupTypeRoleId, classifyRole(r.name));
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

/** Pull the person's profile-picture URL from the member's inlined person object. */
function imageUrlOf(m: GroupMember): string | null {
    const url = (m.person as unknown as { imageUrl?: string | null } | undefined)?.imageUrl;
    return typeof url === 'string' && url.length > 0 ? url : null;
}

/**
 * Return personIds of members whose role on the group has isLeader=false.
 * These are the "Mitglieder" the user means: rank-and-file participants,
 * NOT leaders/co-leaders. We use the role's isLeader flag from the
 * embedded `group.roles` array — same source of truth ChurchTools itself
 * uses to compute its memberStatistics.participants count.
 */
export function participantIdsFromMembers(group: Group, members: GroupMember[]): number[] {
    const roles = group.roles ?? [];
    const leaderRoleIds = new Set(
        roles.filter((r) => r.isLeader === true).map((r) => r.groupTypeRoleId),
    );
    return members
        .filter((m) => !leaderRoleIds.has(m.groupTypeRoleId))
        .map((m) => personIdOf(m));
}

function personIdOf(m: GroupMember): number {
    const idStr = m.person?.domainIdentifier;
    return idStr != null ? parseInt(idStr, 10) : (m.personId ?? 0);
}

/**
 * Map a role name to its bucket. We trust ChurchTools' isLeader flag for
 * inclusion; this routine only decides which sub-group the leader lands
 * in for display. Everything that isn't explicitly "Co-Leiter" defaults
 * to `primary` so an installation that uses different role names still
 * shows people somewhere.
 */
function classifyRole(roleName: string | undefined): LeaderClass {
    const normalized = (roleName ?? '').trim().toLowerCase();
    if (normalized === 'co-leiter' || normalized === 'coleiter') return 'coLeader';
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
