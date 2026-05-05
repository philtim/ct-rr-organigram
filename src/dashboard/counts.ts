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
            const idStr = m.person?.domainIdentifier;
            const personId = idStr != null ? parseInt(idStr, 10) : (m.personId ?? 0);
            return {
                personId,
                fullName: m.person?.title ?? '',
                initials: deriveInitials(m),
                leaderClass: classByRoleId.get(m.groupTypeRoleId) ?? 'primary',
            };
        });
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
