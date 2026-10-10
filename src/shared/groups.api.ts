/**
 * The group reads every tab makes, written once. Each view used to carry its
 * own copy of these with a comment promising to stay in step with the
 * others; the rule they share now lives in one place instead.
 */
import { ct, fetchAllPages, withRetryOn429 } from './api';

/** A direct child of a group, as `/groups/{id}/children` describes it. */
export type ChildGroup = {
    id: number;
    title: string;
    /** Null when the row carries none — it then matches no configured type. */
    groupTypeId: number | null;
};

type ChildRow = {
    title?: string;
    /** The group id, as a numeric string (recon-confirmed). */
    domainIdentifier?: string;
    domainAttributes?: { groupTypeId?: number };
};

/**
 * A group's direct children. These are domain objects, not full groups —
 * id, title and group type are all they carry, and all anyone here needs.
 * Rows without a usable id are dropped rather than passed on as NaN.
 */
export async function getChildGroups(groupId: number): Promise<ChildGroup[]> {
    const rows = await withRetryOn429(() => ct.get<ChildRow[]>(`/groups/${groupId}/children`));
    const children: ChildGroup[] = [];
    for (const row of rows ?? []) {
        const id = Number(row.domainIdentifier);
        if (!Number.isFinite(id)) continue;
        const groupTypeId = row.domainAttributes?.groupTypeId;
        children.push({
            id,
            title: row.title ?? '',
            groupTypeId: typeof groupTypeId === 'number' ? groupTypeId : null,
        });
    }
    return children;
}

/** The children whose group type the admin configured as a team type. */
export function teamsAmong(children: ChildGroup[], teamTypeIds: readonly number[]): ChildGroup[] {
    const types = new Set(teamTypeIds);
    return children.filter((c) => c.groupTypeId !== null && types.has(c.groupTypeId));
}

/**
 * Every active member of a group, with the requested person fields inlined.
 *
 * **Active only, everywhere.** A `waiting` or `requested` member belongs in
 * none of the views, and because every tab reads members through this one
 * function, no tab can count a person another does not.
 */
export async function fetchActiveMembers<T>(
    groupId: number,
    personFields: readonly string[] = [],
): Promise<T[]> {
    const params = new URLSearchParams();
    params.append('group_member_statuses[]', 'active');
    for (const field of personFields) params.append('personFields[]', field);
    // 200 is the endpoint's page cap, not the size of a group.
    return await fetchAllPages<T>(`/groups/${groupId}/members?${params}`, 200);
}

/**
 * A member row's person id, or null when it carries none. `member.personId`
 * exists but is deprecated; recon found `person.domainIdentifier` on every
 * row. A row without one is skipped by every caller, never merged into a
 * shared "person 0".
 */
export function personIdOf(member: { person?: { domainIdentifier?: string } }): number | null {
    const raw = member.person?.domainIdentifier;
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
}

/**
 * `personFields` is typed as an array but the live API answers with a plain
 * object (`{birthday, street, …}`). Accept either rather than depend on which.
 */
export function personFieldsOf(member: { personFields?: unknown }): Record<string, unknown> {
    const raw = member.personFields;
    if (Array.isArray(raw)) return Object.assign({}, ...raw) as Record<string, unknown>;
    if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
    return {};
}
