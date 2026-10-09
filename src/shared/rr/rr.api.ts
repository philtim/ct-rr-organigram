import { ct, fetchAllMembers, mapWithConcurrency, withRetryOn429 } from '@/shared/api';
import type { GroupMember } from '@/shared/types';
import type { Relationship, RrParticipant } from './types';

/** Person fields the export needs. Requested inline so no /persons calls follow. */
const PERSON_FIELDS = ['birthday', 'street', 'zip', 'city'] as const;

export type TeamRef = { groupId: number; name: string; stammName: string };

type GroupChildRow = {
    title: string;
    domainIdentifier: string;
    domainAttributes?: { groupTypeId?: number };
};

type GroupNameRow = { id?: number; name?: string };

/**
 * The team groups under the given Teilstämme.
 *
 * Scope comes from the same configuration the organigram uses, so the figures
 * describe exactly the Stamm shown in the other tab. Worth knowing when
 * reading the numbers: a Teilstamm that is not configured contributes nobody.
 * On the live instance that is what keeps "RR Extended" out — it sits under a
 * Teilstamm that is not selected — so adding that Teilstamm for the organigram
 * would silently widen the billing scope too. The view therefore shows how
 * many teams were resolved.
 *
 * Own call rather than reusing the dashboard's `getGroupChildren`: shared code
 * importing from a feature folder inverts ADR-004's direction.
 */
export async function resolveTeams(
    teilstammIds: number[],
    teamGroupTypeIds: number[],
): Promise<TeamRef[]> {
    const teamTypes = new Set(teamGroupTypeIds);
    const [stammNames, perTeilstamm] = await Promise.all([
        fetchGroupNames(teilstammIds),
        mapWithConcurrency(teilstammIds, 4, async (teilstammId) => {
            const children = await withRetryOn429(() =>
                ct.get<GroupChildRow[]>(`/groups/${teilstammId}/children`),
            );
            return {
                teilstammId,
                teams: (children ?? []).filter((child) =>
                    teamTypes.has(child.domainAttributes?.groupTypeId ?? -1),
                ),
            };
        }),
    ]);

    const byId = new Map<number, TeamRef>();
    for (const { teilstammId, teams } of perTeilstamm) {
        for (const child of teams) {
            const groupId = Number(child.domainIdentifier);
            if (!Number.isFinite(groupId) || byId.has(groupId)) continue;
            byId.set(groupId, {
                groupId,
                name: child.title,
                stammName: stammNames.get(teilstammId) ?? '',
            });
        }
    }
    return [...byId.values()];
}

/**
 * Group names for the given ids, in one request. Only the export uses these —
 * the figures need no labels — so a failure here must not cost the whole tab
 * its numbers: an empty map leaves the Teilstamm column blank and everything
 * else intact.
 */
async function fetchGroupNames(groupIds: number[]): Promise<Map<number, string>> {
    const names = new Map<number, string>();
    if (groupIds.length === 0) return names;
    const query = groupIds.map((id) => `ids[]=${id}`).join('&');
    try {
        const groups = await withRetryOn429(() =>
            ct.get<GroupNameRow[]>(`/groups?${query}&limit=${groupIds.length}`),
        );
        for (const group of groups ?? []) {
            if (typeof group.id === 'number' && group.name) names.set(group.id, group.name);
        }
    } catch (e) {
        console.warn('[rr-dashboard] Teilstamm names unavailable:', e);
    }
    return names;
}

export type TeamMembers = {
    participants: RrParticipant[];
    /** Participants who are themselves Mitarbeiter — see `fetchTeamMembers`. */
    staffPersonIds: Set<number>;
};

/** Used by both tabs, so both answer "who leads" the same way (`shared/roles`). */
export type LeaderRoleIds = ReadonlySet<number>;

/**
 * Active members of the given team groups, one request per team, split into
 * participants and staff.
 *
 * Both come from the same response on purpose. Asking the server twice — once
 * with `role_ids[]=8` and once without — would double the request count for an
 * answer already in hand.
 *
 * **Staff is derived from roles, not from the "RR Mitarbeiter" Merkmal group.**
 * That group is auto-populated from exactly these memberships, so the two
 * agree (checked against the live instance: both yield the same 17 people, no
 * difference either way), and deriving it needs no installation-specific group
 * id in the source or in the configuration. It also removes the staleness the
 * Merkmal group carries: its nightly run means a participant added today is in
 * neither Merkmal group yet, while the roles are current the moment someone
 * saves them.
 *
 * Which roles count as leading comes from `shared/roles` via `leaderRoleIds`
 * — the same rule the organigram uses, so both tabs classify the same person
 * the same way.
 *
 * Someone can be a participant in more than one team, so results are merged by
 * person id and the team names collected — otherwise they would be counted
 * twice and billed twice.
 */
export async function fetchTeamMembers(
    teams: TeamRef[],
    leaderRoleIds: LeaderRoleIds,
): Promise<TeamMembers> {
    const byPerson = new Map<number, RrParticipant>();
    const staffPersonIds = new Set<number>();

    const pages = await mapWithConcurrency(teams, 6, async (team) => ({
        team,
        members: await fetchAllMembers<GroupMember>(team.groupId, memberQuery()),
    }));

    for (const { team, members } of pages) {
        for (const member of members ?? []) {
            // `member.personId` exists but is deprecated in favour of this;
            // recon found `person.domainIdentifier` populated on every row.
            const personId = Number(member.person?.domainIdentifier);
            if (!Number.isFinite(personId)) continue;

            if (leaderRoleIds.has(member.groupTypeRoleId)) {
                staffPersonIds.add(personId);
                continue;
            }

            const existing = byPerson.get(personId);
            if (existing) {
                if (!existing.teamNames.includes(team.name)) existing.teamNames.push(team.name);
                if (team.stammName && !existing.stammNames.includes(team.stammName)) {
                    existing.stammNames.push(team.stammName);
                }
                continue;
            }
            byPerson.set(personId, toParticipant(personId, member, team));
        }
    }

    for (const participant of byPerson.values()) {
        participant.teamNames.sort();
        participant.stammNames.sort();
    }
    return { participants: [...byPerson.values()], staffPersonIds };
}

function memberQuery(): string {
    const params = new URLSearchParams();
    // Same filter the organigram applies, so neither tab counts a person the
    // other does not. A `waiting` or `requested` member belongs in neither.
    params.append('group_member_statuses[]', 'active');
    for (const field of PERSON_FIELDS) params.append('personFields[]', field);
    params.set('limit', '200');
    return params.toString();
}

/**
 * Person ids with an active membership in any of the given groups — the
 * Teilstamm-MA groups and the Hauptstamm. Someone who is a Mitarbeiter at
 * Teilstamm level without holding a role in any team is only visible here.
 *
 * Adds nobody on the live instance today; it is the cheap half of the staff
 * definition that does not depend on team roles being maintained.
 */
export async function fetchStaffFromGroups(
    groupIds: number[],
    leaderRoleIds: LeaderRoleIds,
): Promise<Set<number>> {
    const ids = new Set<number>();
    const pages = await mapWithConcurrency(groupIds, 4, (groupId) =>
        fetchAllMembers<GroupMember>(groupId, 'group_member_statuses[]=active&limit=200'),
    );
    for (const members of pages) {
        for (const member of members ?? []) {
            if (!leaderRoleIds.has(member.groupTypeRoleId)) continue;
            const personId = Number(member.person?.domainIdentifier);
            if (Number.isFinite(personId)) ids.add(personId);
        }
    }
    return ids;
}

function toParticipant(personId: number, member: GroupMember, team: TeamRef): RrParticipant {
    const attrs = (member.person?.domainAttributes ?? {}) as {
        firstName?: string;
        lastName?: string;
    };
    const fields = personFieldsOf(member);
    return {
        personId,
        firstName: (attrs.firstName ?? '').trim(),
        lastName: (attrs.lastName ?? '').trim(),
        birthday: text(fields.birthday),
        street: text(fields.street),
        zip: text(fields.zip),
        city: text(fields.city),
        teamNames: [team.name],
        stammNames: team.stammName ? [team.stammName] : [],
    };
}

/**
 * `personFields` is typed as an array but the live API answers with a plain
 * object (`{birthday, street, …}`). Accept either rather than depend on which.
 */
export function personFieldsOf(member: GroupMember): Record<string, unknown> {
    const raw = member.personFields as unknown;
    if (Array.isArray(raw)) return Object.assign({}, ...raw) as Record<string, unknown>;
    if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
    return {};
}

function text(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

const RELATIONSHIP_PARENT_CHILD = 1;
const RELATIONSHIP_SIBLING = 3;

/**
 * The relationship graph, reduced to the edges that touch a participant.
 *
 * **One request, not one per person.** `GET /persons/relationships` takes no
 * person filter and ignores `limit` and `page`, so it answers with every
 * relationship in the installation — 5,940 rows on the live instance. An
 * earlier version of this file rejected it for that reason and asked per
 * person instead. That was the wrong call, from comparing uncompressed sizes:
 * browsers negotiate gzip, and measured against the live instance the one
 * request transfers **116 KB in 0.7 s**, while 305 single requests take
 * 15 s — and trip the instance's rate limit on a second run. Both produce
 * byte-identical families and totals; that equivalence was verified before
 * this was changed.
 *
 * The cost is honest over-fetching: the response covers the whole
 * congregation, including relationship types this code never reads. It
 * arrives under the viewer's own permissions, nothing is rendered from it,
 * and only parent and sibling edges touching a participant are kept — the
 * rest is dropped before anything else sees it.
 *
 * Edge direction (recon-confirmed, and the one thing worth getting right
 * here): for type 1, `personA` is the **parent** and `personB` the **child**.
 */
export async function fetchRelationships(personIds: number[]): Promise<Relationship[]> {
    type BulkRow = {
        personAId?: number;
        personBId?: number;
        relationshipType?: { id?: number };
    };

    const participantIds = new Set(personIds);
    const rows = await withRetryOn429(() => ct.get<BulkRow[]>('/persons/relationships'));

    const relationships: Relationship[] = [];
    for (const row of rows ?? []) {
        const parentOrSiblingA = row.personAId;
        const childOrSiblingB = row.personBId;
        if (typeof parentOrSiblingA !== 'number' || typeof childOrSiblingB !== 'number') continue;

        const typeId = row.relationshipType?.id;
        if (typeId === RELATIONSHIP_PARENT_CHILD) {
            if (participantIds.has(childOrSiblingB)) {
                relationships.push({
                    personId: childOrSiblingB,
                    relativeId: parentOrSiblingA,
                    kind: 'parent',
                });
            }
        } else if (typeId === RELATIONSHIP_SIBLING) {
            // Stated once in the feed; recorded from both ends so neither
            // sibling depends on which side of the row they landed on.
            if (participantIds.has(parentOrSiblingA)) {
                relationships.push({
                    personId: parentOrSiblingA,
                    relativeId: childOrSiblingB,
                    kind: 'sibling',
                });
            }
            if (participantIds.has(childOrSiblingB)) {
                relationships.push({
                    personId: childOrSiblingB,
                    relativeId: parentOrSiblingA,
                    kind: 'sibling',
                });
            }
        }
    }
    return relationships;
}
