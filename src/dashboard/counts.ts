import { isLeaderRole, isLeadershipRole } from '@/shared/roles';
import type { Group, GroupMember, Leader, LeaderRole, Participant } from '@/shared/types';

/** What the cards need to know about the role a member holds. */
type RoleInfo = { name: string; sortKey: number; isPillRole: boolean };

/**
 * Filter members to those whose role counts as a "leader" for the
 * Leiter stat tile. A role counts when ChurchTools flags it isLeader=true
 * OR its (lowercased) name matches one of the broadened role names
 * (Mitarbeiter / Teamhelfer / Organisator) — needed to align the count
 * with the "RR Mitarbeiter" auto-group on the live instance, whose rule
 * treats those non-isLeader roles as MAs.
 *
 * Each returned Leader carries its role name and sort key, so the cards
 * can group by the role ChurchTools actually defines — Stammleiter,
 * Hauptstammwart, … — instead of squeezing everything into fixed buckets.
 */
export function leadersFromMembers(
    group: Group,
    members: GroupMember[],
    extraLeaderRoleIds: ReadonlySet<number>,
): Leader[] {
    const roles = group.roles ?? [];
    const infoByRoleId = new Map<number, RoleInfo>();
    for (const r of roles) {
        if (isLeaderRole(r, extraLeaderRoleIds)) {
            infoByRoleId.set(r.groupTypeRoleId, {
                name: (r.name ?? '').trim(),
                sortKey: r.sortKey ?? 0,
                isPillRole: isLeadershipRole(r),
            });
        }
    }

    return members
        .filter((m) => infoByRoleId.has(m.groupTypeRoleId))
        .map((m) => {
            const info = infoByRoleId.get(m.groupTypeRoleId)!;
            return {
                personId: personIdOf(m),
                fullName: m.person?.title ?? '',
                initials: deriveInitials(m),
                imageUrl: imageUrlOf(m),
                roleId: m.groupTypeRoleId,
                roleName: info.name,
                roleSortKey: info.sortKey,
                isPillRole: info.isPillRole,
            };
        });
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
export function participantsFromMembers(
    group: Group,
    members: GroupMember[],
    extraLeaderRoleIds: ReadonlySet<number>,
): Participant[] {
    const roles = group.roles ?? [];
    const leaderRoleIds = new Set(
        roles.filter((r) => isLeaderRole(r, extraLeaderRoleIds)).map((r) => r.groupTypeRoleId),
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

/**
 * Count members whose "Horizont" group-member field (checkbox) is set.
 * The live API inlines member fields as an array of {name, value} where
 * a checked checkbox arrives as value "1"; the generated GroupMember
 * type declares `fields` as an object, so parse defensively and treat
 * anything that isn't the recon-confirmed array shape as "no field".
 */
export function horizontCountFromMembers(members: GroupMember[], fieldName: string): number {
    const wanted = fieldName.trim().toLowerCase();
    if (!wanted) return 0;
    let count = 0;
    for (const m of members) {
        const fields = (m as { fields?: unknown }).fields;
        if (!Array.isArray(fields)) continue;
        for (const f of fields) {
            const entry = f as { name?: unknown; value?: unknown };
            if (
                typeof entry.name === 'string' &&
                entry.name.trim().toLowerCase() === wanted &&
                (entry.value === '1' || entry.value === 1 || entry.value === true)
            ) {
                count += 1;
                break;
            }
        }
    }
    return count;
}

/**
 * Build the rows a card renders: one per leadership role, in the group type's
 * own order, each with the people holding it.
 *
 * A role appears when somebody holds it. `alwaysShow` lets a card keep a role
 * visible even when vacant — the Teilstamm card uses it so a missing Stammwart
 * reads as an open position rather than disappearing.
 */
export function leaderRoleRows(
    roles: LeaderRole[],
    leaders: Leader[],
    alwaysShow: (roleId: number) => boolean = () => false,
): Array<{ role: string; leaders: Leader[] }> {
    const byRole = new Map<string, Leader[]>();
    for (const l of leaders) {
        if (!l.isPillRole) continue;
        const bucket = byRole.get(l.roleName);
        if (bucket) bucket.push(l);
        else byRole.set(l.roleName, [l]);
    }

    const rows: Array<{ role: string; leaders: Leader[] }> = [];
    const seen = new Set<string>();
    for (const r of [...roles].sort((a, b) => a.sortKey - b.sortKey)) {
        seen.add(r.name);
        const held = byRole.get(r.name) ?? [];
        if (held.length || alwaysShow(r.id)) rows.push({ role: r.name, leaders: held });
    }
    // Roles held by someone but missing from the group's role list (hidden or
    // deactivated after the fact) must not vanish — append them by sort key.
    const leftover = [...byRole.entries()]
        .filter(([name]) => !seen.has(name))
        .sort((a, b) => a[1][0].roleSortKey - b[1][0].roleSortKey);
    for (const [role, held] of leftover) rows.push({ role, leaders: held });
    return rows;
}

/** The leadership roles a group defines, skipping hidden and deactivated ones. */
export function leaderRolesOf(group: Group): LeaderRole[] {
    return (group.roles ?? [])
        .filter((r) => isLeadershipRole(r) && r.isHidden !== true && r.isActive !== false)
        .map((r) => ({
            id: r.groupTypeRoleId,
            name: (r.name ?? '').trim(),
            sortKey: r.sortKey ?? 0,
        }))
        .sort((a, b) => a.sortKey - b.sortKey);
}
