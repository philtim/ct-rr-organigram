import { COPY } from '@/shared/copy';
import { personIdOf } from '@/shared/groups.api';
import { isCountedLeadershipRole, isLeaderRole } from '@/shared/roles';
import type { LeaderRule } from '@/shared/roles';
import type { Group, GroupMember } from '@/shared/types';
import type { Leader, LeaderRole, OrgNode, Participant } from './types';

/** What the cards need to know about the role a member holds. */
type RoleInfo = { name: string; sortKey: number; isPillRole: boolean };

/**
 * Split a group's members into leaders and participants. A role counts as
 * leader when ChurchTools flags it as leadership and the admin did not take
 * it out, or when the admin added it — see `shared/roles.ts`.
 *
 * Each Leader carries its role name and sort key, so the cards can group by
 * the role ChurchTools actually defines instead of squeezing everything into
 * fixed buckets.
 *
 * A person can still be a participant here and a leader in another group of
 * the same load; the roll-up (rollup.ts) gives leader status precedence
 * across the tree.
 */
export function splitMembers(
    group: Group,
    members: GroupMember[],
    rule: LeaderRule,
): { leaders: Leader[]; participants: Participant[] } {
    const infoByRoleId = new Map<number, RoleInfo>();
    for (const r of group.roles ?? []) {
        if (isLeaderRole(r, rule)) {
            infoByRoleId.set(r.groupTypeRoleId, {
                name: (r.name ?? '').trim(),
                sortKey: r.sortKey ?? 0,
                isPillRole: isCountedLeadershipRole(r, rule),
            });
        }
    }

    const leaders: Leader[] = [];
    const participants: Participant[] = [];
    for (const m of members) {
        const personId = personIdOf(m);
        if (personId === null) continue;
        const info = infoByRoleId.get(m.groupTypeRoleId);
        const fullName = m.person?.title ?? '';
        if (!info) {
            participants.push({ personId, fullName });
            continue;
        }
        leaders.push({
            personId,
            fullName,
            initials: deriveInitials(m),
            imageUrl: imageUrlOf(m),
            roleId: m.groupTypeRoleId,
            roleName: info.name,
            roleSortKey: info.sortKey,
            isPillRole: info.isPillRole,
        });
    }
    return { leaders, participants };
}

/** Pull the person's profile-picture URL from the member's inlined person object. */
function imageUrlOf(m: GroupMember): string | null {
    const url = m.person?.imageUrl;
    return typeof url === 'string' && url.length > 0 ? url : null;
}

/**
 * Use the API-provided initials when available; otherwise fall back to
 * first letters of first/last name.
 */
function deriveInitials(member: GroupMember): string {
    const inlinedInitials = member.person?.initials;
    if (inlinedInitials) return inlinedInitials;
    const attrs = member.person?.domainAttributes;
    const f = attrs?.firstName?.[0] ?? '';
    const l = attrs?.lastName?.[0] ?? '';
    return `${f}${l}`.toUpperCase();
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
        const fields = m.fields;
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
 * Whether any member carries the field at all, ticked or not. A configured
 * field that no group has is a misconfiguration — a renamed or deleted field
 * — and the dashboard says so instead of showing a quiet 0.
 */
export function hasMemberField(members: GroupMember[], fieldName: string): boolean {
    const wanted = fieldName.trim().toLowerCase();
    if (!wanted) return false;
    return members.some(
        (m) =>
            Array.isArray(m.fields) &&
            m.fields.some((f) => {
                const name = (f as { name?: unknown }).name;
                return typeof name === 'string' && name.trim().toLowerCase() === wanted;
            }),
    );
}

/** Whether any group in the tree carries the configured field — see `hasMemberField`. */
export function fieldSeenInTree(node: OrgNode): boolean {
    return Boolean(node.horizontFieldSeen) || node.children.some(fieldSeenInTree);
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
export function leaderRolesOf(group: Group, rule: LeaderRule): LeaderRole[] {
    return (group.roles ?? [])
        .filter(
            (r) => isCountedLeadershipRole(r, rule) && r.isHidden !== true && r.isActive !== false,
        )
        .map((r) => ({
            id: r.groupTypeRoleId,
            name: (r.name ?? '').trim(),
            sortKey: r.sortKey ?? 0,
        }))
        .sort((a, b) => a.sortKey - b.sortKey);
}

/**
 * The written-out counts of a compact card — the team chip, and the Teilstamm
 * card on mobile. "?" wherever the node's figures are incomplete.
 */
export function countsLine(node: OrgNode): string {
    return node.incomplete
        ? COPY.countsLine('?', '?')
        : COPY.countsLine(node.leaderCount, node.memberCount);
}

/**
 * The configured member field's count, named after the field, or null when
 * the Stamm keeps none — a hardcoded "0× Horizont" would read as an answer
 * about something it does not do. An explicit "0×" is an answer: the team
 * really ordered nothing.
 */
export function fieldLine(node: OrgNode, fieldName: string): string | null {
    if (!fieldName) return null;
    return COPY.fieldLine(node.incomplete ? '?' : node.horizontCount, fieldName);
}
