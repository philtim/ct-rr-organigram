import {
    ct,
    fetchAllMembers,
    fetchAllPages,
    mapWithConcurrency,
    withRetryOn429,
} from '@/shared/api';
import { isLeadershipRole } from '@/shared/roles';
import type { Group } from '@/shared/types';

/**
 * List all groups visible to the current user. Used to populate the
 * Hauptstamm picker (US-2). Real ChurchTools instances have well over
 * the /groups page cap (200), so we paginate; the picker filters
 * client-side so the network cost is paid once at open time.
 */
export async function listGroups(): Promise<Group[]> {
    return await fetchAllPages<Group>('/groups', { limit: 200 });
}

/** Re-export so the Teilstamm picker can list a group's direct children. */
export { getGroupChildren } from '@/dashboard/dashboard.api';
export type { GroupChild } from '@/dashboard/dashboard.api';

export type GroupTypeRef = { id: number; name: string };

/** The installation's group types, so the pickers can name them. */
export async function listGroupTypes(): Promise<GroupTypeRef[]> {
    const types = await ct.get<Array<{ id?: number; name?: string }>>('/group/grouptypes');
    return (types ?? [])
        .filter((t): t is { id: number; name?: string } => typeof t.id === 'number')
        .map((t) => ({ id: t.id, name: (t.name ?? '').trim() || `Typ ${t.id}` }));
}

/** One selectable role, from the installation-wide role list. */
export type PickableRole = {
    id: number;
    name: string;
    groupTypeId: number | null;
    /** True when ChurchTools itself calls this leadership — always counts. */
    isLeadership: boolean;
};

/**
 * Every role definition in the installation.
 *
 * `GET /group/roles` rather than one group's `roles` include: the admin picks
 * roles that may be held in the Hauptstamm *or* in any Teilstamm, and
 * `groupTypeRoleId` is unique installation-wide, so one flat list covers all
 * of them without caring which group type each belongs to.
 */
export async function listRoles(): Promise<PickableRole[]> {
    const roles = await ct.get<
        Array<{
            id?: number;
            name?: string;
            groupTypeId?: number;
            type?: string;
            isLeader?: boolean;
        }>
    >('/group/roles');
    return (roles ?? [])
        .filter((r): r is { id: number } & typeof r => typeof r.id === 'number')
        .map((r) => ({
            id: r.id,
            name: (r.name ?? '').trim() || `Rolle ${r.id}`,
            groupTypeId: typeof r.groupTypeId === 'number' ? r.groupTypeId : null,
            isLeadership: isLeadershipRole(r),
        }));
}

/** A candidate team: a child of some Teilstamm, with the type that decides it. */
export type ChildGroup = {
    id: number;
    title: string;
    groupTypeId: number;
    teilstammId: number;
};

/**
 * What the admin screen needs to show consequences instead of asking abstract
 * questions: which group types actually occur under the chosen Teilstämme,
 * how many people hold each role, and which member fields exist.
 *
 * Deliberately carries **ids and counts only** — no names, no birthdays, no
 * addresses. The configuration screen has no business holding person data
 * (ADR-011), and everything it renders is a number.
 */
export type ScopeScan = {
    children: ChildGroup[];
    /** personId → the role ids they hold anywhere in scope. */
    rolesByPerson: Map<number, Set<number>>;
    /** groupId → the person ids active in it. */
    personsByGroup: Map<number, Set<number>>;
    /** Member field names found on team memberships, for the member-field hint. */
    memberFieldNames: string[];
    /**
     * True when at least one group could not be read. Every count derived
     * from this scan is then a lower bound, and the screen says so instead of
     * presenting a short number as the answer.
     */
    incomplete: boolean;
};

type MemberRow = {
    person?: { domainIdentifier?: string };
    groupTypeRoleId: number;
    fields?: unknown;
};

/**
 * Active members of one group. Shares the paginating reader with the figures,
 * so the admin's hints cannot report a different headcount than the dashboard
 * does. A failure is reported rather than swallowed: an admin reading
 * "0 Personen" should not have to wonder whether it means "nobody" or
 * "could not ask".
 */
async function membersOf(groupId: number): Promise<MemberRow[] | null> {
    try {
        return await fetchAllMembers<MemberRow>(
            groupId,
            'group_member_statuses[]=active&limit=200',
        );
    } catch (e) {
        console.error(`[rr-dashboard] admin scan: members of ${groupId} unavailable:`, e);
        return null;
    }
}

async function childrenOf(groupId: number): Promise<ChildGroup[] | null> {
    try {
        const rows = await withRetryOn429(() =>
            ct.get<
                Array<{
                    title: string;
                    domainIdentifier: string;
                    domainAttributes?: { groupTypeId?: number };
                }>
            >(`/groups/${groupId}/children`),
        );
        return (rows ?? [])
            .map((row) => ({
                id: Number(row.domainIdentifier),
                title: row.title,
                groupTypeId: row.domainAttributes?.groupTypeId ?? -1,
                teilstammId: groupId,
            }))
            .filter((c) => Number.isFinite(c.id));
    } catch (e) {
        console.error(`[rr-dashboard] admin scan: children of ${groupId} unavailable:`, e);
        return null;
    }
}

/**
 * One pass over the configured scope. Run on demand rather than on every
 * keystroke — it is one request per group, some thirty on a full Stamm.
 */
export async function scanScope(
    gateGroupId: number | null,
    teilstammIds: number[],
): Promise<ScopeScan> {
    let incomplete = false;
    const childLists = await mapWithConcurrency(teilstammIds, 4, childrenOf);
    for (const list of childLists) if (list === null) incomplete = true;
    const children = childLists.flat().filter((c): c is ChildGroup => c !== null);

    const groupIds = [
        ...new Set([
            ...(gateGroupId === null ? [] : [gateGroupId]),
            ...teilstammIds,
            ...children.map((c) => c.id),
        ]),
    ];
    const memberLists = await mapWithConcurrency(groupIds, 6, async (id) => ({
        id,
        members: await membersOf(id),
    }));

    const rolesByPerson = new Map<number, Set<number>>();
    const personsByGroup = new Map<number, Set<number>>();
    const fieldNames = new Set<string>();

    for (const { id, members } of memberLists) {
        if (members === null) incomplete = true;
        const persons = new Set<number>();
        for (const member of members ?? []) {
            const personId = Number(member.person?.domainIdentifier);
            if (!Number.isFinite(personId)) continue;
            persons.add(personId);

            const held = rolesByPerson.get(personId) ?? new Set<number>();
            held.add(member.groupTypeRoleId);
            rolesByPerson.set(personId, held);

            if (Array.isArray(member.fields)) {
                for (const field of member.fields) {
                    const name = (field as { name?: unknown }).name;
                    if (typeof name === 'string' && name.trim()) fieldNames.add(name.trim());
                }
            }
        }
        personsByGroup.set(id, persons);
    }

    return {
        children,
        rolesByPerson,
        personsByGroup,
        memberFieldNames: [...fieldNames].sort((a, b) => a.localeCompare(b, 'de')),
        incomplete,
    };
}

/** How many people in scope hold a given role. Drives the hints in the picker. */
export function personsWithRole(scan: ScopeScan, roleId: number): number {
    let count = 0;
    for (const held of scan.rolesByPerson.values()) if (held.has(roleId)) count += 1;
    return count;
}

/** Unique people the current selection would cover. The preview line. */
export function personsInScope(
    scan: ScopeScan,
    gateGroupId: number | null,
    teilstammIds: number[],
    teamGroupTypeIds: number[],
): number {
    const types = new Set(teamGroupTypeIds);
    const groupIds = [
        ...(gateGroupId === null ? [] : [gateGroupId]),
        ...teilstammIds,
        ...scan.children.filter((c) => types.has(c.groupTypeId)).map((c) => c.id),
    ];

    const persons = new Set<number>();
    for (const id of groupIds) {
        for (const personId of scan.personsByGroup.get(id) ?? []) persons.add(personId);
    }
    return persons.size;
}
