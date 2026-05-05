import type { Group, GroupMember } from '@/shared/types';

export type Leader = {
    personId: number;
    fullName: string;
    initials: string;
};

/**
 * Filter members to those whose role on the group has isLeader=true.
 * Maps to the slim Leader shape used by the cards.
 */
export function leadersFromMembers(group: Group, members: GroupMember[]): Leader[] {
    const roles = group.roles ?? [];
    const leaderRoleIds = new Set(
        roles.filter((r) => r.isLeader === true).map((r) => r.groupTypeRoleId),
    );

    return members
        .filter((m) => leaderRoleIds.has(m.groupTypeRoleId))
        .map((m) => {
            const idStr = m.person?.domainIdentifier;
            const personId = idStr != null ? parseInt(idStr, 10) : (m.personId ?? 0);
            return {
                personId,
                fullName: m.person?.title ?? '',
                initials: deriveInitials(m),
            };
        });
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
