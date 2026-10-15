import { ct, fetchAllPages, mapWithConcurrency, statusOf, withRetryOn429 } from '@/shared/api';
import { fetchActiveMembers, getChildGroups, personIdOf } from '@/shared/groups.api';
import { isLeadershipRole } from '@/shared/roles';
import type { Group } from '@/shared/types';

/**
 * List all groups visible to the current user. Used to populate the
 * Hauptstamm picker (US-2). Real ChurchTools instances have well over
 * the /groups page cap (200), so we paginate; the picker filters
 * client-side so the network cost is paid once at open time.
 */
export async function listGroups(): Promise<Group[]> {
    return await fetchAllPages<Group>('/groups', 200);
}

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

/**
 * The signed-in person's role in a group, or null when they are not a member.
 * Only a 404 means "not a member" — the gate's rule; anything else is an
 * error the caller sees, rather than a lockout warning that is not true.
 */
export async function myRoleIn(groupId: number): Promise<number | null> {
    const me = await ct.get<{ id: number }>('/whoami');
    try {
        const membership = await ct.get<{ groupTypeRoleId?: number }>(
            `/groups/${groupId}/members/${me.id}`,
        );
        return typeof membership?.groupTypeRoleId === 'number' ? membership.groupTypeRoleId : null;
    } catch (e) {
        if (statusOf(e) === 404) return null;
        throw e;
    }
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
    /** groupId → personId → the role they hold in that group. */
    membersByGroup: Map<number, Map<number, number>>;
    /**
     * Checkbox member fields defined on the groups in scope — the only kind
     * the Horizont tile can count, so the only kind the picker offers.
     */
    checkboxFieldNames: string[];
    /**
     * True when some group's field definitions could not be read. The list
     * above may then lack a field that exists, so nothing may be called
     * "no longer found".
     */
    fieldsIncomplete: boolean;
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
};

type MemberFieldRow = { type?: string; field?: { name?: string; fieldTypeCode?: string } };

/**
 * Field definitions already read, by group id. The scan reruns on every
 * Teilstamm ticked, and a group's fields do not change while the form is
 * open; a field added meanwhile appears after reloading the page.
 */
const checkboxFieldCache = new Map<number, string[]>();

/**
 * The group's own checkbox member fields, by name. `type: 'person'` rows are
 * person fields shown on the membership, not fields of the group, and carry
 * no name of their own.
 */
async function checkboxFieldsOf(groupId: number): Promise<string[] | null> {
    const cached = checkboxFieldCache.get(groupId);
    if (cached) return cached;
    try {
        const rows = await withRetryOn429(() =>
            ct.get<MemberFieldRow[]>(`/groups/${groupId}/memberfields`),
        );
        const names = (rows ?? [])
            .filter((r) => r.type === 'group' && r.field?.fieldTypeCode === 'checkbox')
            .map((r) => (r.field?.name ?? '').trim())
            .filter((name) => name !== '');
        checkboxFieldCache.set(groupId, names);
        return names;
    } catch (e) {
        console.error(`[rr-dashboard] admin scan: member fields of ${groupId} unavailable:`, e);
        return null;
    }
}

/**
 * Active members of one group. Shares the paginating reader with the figures,
 * so the admin's hints cannot report a different headcount than the dashboard
 * does. A failure is reported rather than swallowed: an admin reading
 * "0 Personen" should not have to wonder whether it means "nobody" or
 * "could not ask".
 */
async function membersOf(groupId: number): Promise<MemberRow[] | null> {
    try {
        return await fetchActiveMembers<MemberRow>(groupId);
    } catch (e) {
        console.error(`[rr-dashboard] admin scan: members of ${groupId} unavailable:`, e);
        return null;
    }
}

/**
 * A group's children as the admin screen lists them. A type-less row gets
 * -1, which matches no group type, so it is listed but never picked up.
 */
export async function listChildren(groupId: number): Promise<ChildGroup[]> {
    return (await getChildGroups(groupId)).map((c) => ({
        id: c.id,
        title: c.title,
        groupTypeId: c.groupTypeId ?? -1,
        teilstammId: groupId,
    }));
}

async function childrenOf(groupId: number): Promise<ChildGroup[] | null> {
    try {
        return await listChildren(groupId);
    } catch (e) {
        console.error(`[rr-dashboard] admin scan: children of ${groupId} unavailable:`, e);
        return null;
    }
}

/**
 * One pass over the configured scope. Run on demand rather than on every
 * keystroke — one request per Teilstamm for its children, then per group its
 * members and, the first time, its field definitions: some seventy requests
 * on a full Stamm. The two reads of a group run one after the other, so no
 * more than six are in flight — the pool size the organigram found the rate
 * limit tolerates.
 */
export async function scanScope(
    gateGroupId: number | null,
    teilstammIds: number[],
    collectionGroupIds: number[] = [],
): Promise<ScopeScan> {
    let incomplete = false;
    const childLists = await mapWithConcurrency(teilstammIds, 4, childrenOf);
    for (const list of childLists) if (list === null) incomplete = true;
    const children = childLists.flat().filter((c): c is ChildGroup => c !== null);

    const groupIds = [
        ...new Set([
            ...(gateGroupId === null ? [] : [gateGroupId]),
            ...teilstammIds,
            ...collectionGroupIds,
            ...children.map((c) => c.id),
        ]),
    ];
    const memberLists = await mapWithConcurrency(groupIds, 6, async (id) => {
        const members = await membersOf(id);
        const checkboxFields = await checkboxFieldsOf(id);
        return { id, members, checkboxFields };
    });

    const rolesByPerson = new Map<number, Set<number>>();
    const membersByGroup = new Map<number, Map<number, number>>();
    const fieldNames = new Set<string>();

    let fieldsIncomplete = false;
    for (const { id, members, checkboxFields } of memberLists) {
        if (members === null) incomplete = true;
        if (checkboxFields === null) fieldsIncomplete = true;
        for (const name of checkboxFields ?? []) fieldNames.add(name);
        const persons = new Map<number, number>();
        for (const member of members ?? []) {
            const personId = personIdOf(member);
            if (personId === null) continue;
            persons.set(personId, member.groupTypeRoleId);

            const held = rolesByPerson.get(personId) ?? new Set<number>();
            held.add(member.groupTypeRoleId);
            rolesByPerson.set(personId, held);
        }
        membersByGroup.set(id, persons);
    }

    return {
        children,
        rolesByPerson,
        membersByGroup,
        fieldsIncomplete,
        checkboxFieldNames: [...fieldNames].sort((a, b) => a.localeCompare(b, 'de')),
        incomplete,
    };
}
