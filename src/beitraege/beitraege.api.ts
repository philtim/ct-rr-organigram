import { ct, mapWithConcurrency, withRetryOn429 } from '@/shared/api';
import {
    fetchActiveMembers,
    getChildGroups,
    personFieldsOf,
    personIdOf,
    teamsAmong,
} from '@/shared/groups.api';
import type { LeaderRoleIds } from '@/shared/roles';
import type { GroupMember } from '@/shared/types';
import { participantEdges, resolveRelationshipTypes } from './relationships';
import { COPY } from '@/shared/copy';
import type { RelationshipRow, RelationshipTypeRow } from './relationships';
import type { Relationship, RrParticipant } from './types';

/** Person fields the export needs. Requested inline so no /persons calls follow. */
const PERSON_FIELDS = ['birthday', 'street', 'zip', 'city'] as const;

export type TeamRef = { groupId: number; name: string; stammName: string };

type GroupNameRow = { id?: number; name?: string };

/**
 * The team groups under the given Teilstämme.
 *
 * Scope comes from the same configuration the organigram uses, so the figures
 * describe exactly the Stamm shown in the other tab. Worth knowing when
 * reading the numbers: a Teilstamm that is not configured contributes nobody,
 * and adding one for the organigram widens the billing scope too. The view
 * therefore shows how many teams were resolved.
 */
export async function resolveTeams(
    teilstammIds: number[],
    teamGroupTypeIds: number[],
): Promise<TeamRef[]> {
    const [stammNames, perTeilstamm] = await Promise.all([
        fetchGroupNames(teilstammIds),
        mapWithConcurrency(teilstammIds, 4, async (teilstammId) => ({
            teilstammId,
            teams: teamsAmong(await getChildGroups(teilstammId), teamGroupTypeIds),
        })),
    ]);

    const byId = new Map<number, TeamRef>();
    for (const { teilstammId, teams } of perTeilstamm) {
        for (const team of teams) {
            if (byId.has(team.id)) continue;
            byId.set(team.id, {
                groupId: team.id,
                name: team.title,
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

/**
 * Active members of the given team groups, one request per team, split into
 * participants and staff.
 *
 * Both come from the same response on purpose: asking the server twice, once
 * filtered by role, would double the request count for an answer already in
 * hand.
 *
 * **Staff is derived from roles, not from the "RR Mitarbeiter" Merkmal group.**
 * That group is auto-populated from exactly these memberships, so the two
 * agree (checked against the live instance), and deriving it needs no
 * installation-specific group id in the source or in the configuration. It also removes the staleness the
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
        members: await fetchActiveMembers<GroupMember>(team.groupId, PERSON_FIELDS),
    }));

    for (const { team, members } of pages) {
        for (const member of members) {
            const personId = personIdOf(member);
            if (personId === null) continue;

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
    isStaff: (roleId: number) => boolean,
): Promise<Set<number>> {
    const ids = new Set<number>();
    const pages = await mapWithConcurrency(groupIds, 4, (groupId) =>
        fetchActiveMembers<GroupMember>(groupId),
    );
    for (const members of pages) {
        for (const member of members) {
            if (!isStaff(member.groupTypeRoleId)) continue;
            const personId = personIdOf(member);
            if (personId !== null) ids.add(personId);
        }
    }
    return ids;
}

function toParticipant(personId: number, member: GroupMember, team: TeamRef): RrParticipant {
    const attrs = member.person?.domainAttributes ?? {};
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
        frontendUrl: member.person?.frontendUrl ?? null,
    };
}

function text(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

/**
 * The relationship graph, reduced to the edges that touch a participant.
 *
 * **One request, not one per person.** `GET /persons/relationships` takes no
 * person filter and ignores `limit` and `page`, so it answers with every
 * relationship in the installation — 5,940 rows on the live instance.
 * Measured there, the one request transfers 116 KB gzipped in 0.7 s, while
 * one request per participant took 15 s and tripped the rate limit on a
 * second run; both produced identical families and totals.
 *
 * The cost is honest over-fetching: the response covers the whole
 * congregation. It arrives under the viewer's own permissions, nothing is
 * rendered from it, and everything but parent and sibling edges touching a
 * participant is dropped before anything else sees it.
 */
export async function fetchRelationships(personIds: number[]): Promise<Relationship[]> {
    const [masterdata, rows] = await Promise.all([
        withRetryOn429(() =>
            ct.get<{ relationshipTypes?: RelationshipTypeRow[] }>('/person/masterdata'),
        ),
        withRetryOn429(() => ct.get<RelationshipRow[]>('/persons/relationships')),
    ]);
    const types = resolveRelationshipTypes(masterdata?.relationshipTypes ?? []);
    // Without it every family would rest on the address alone, and the total
    // would come out too high while looking like an answer.
    if (types.parentChild === null) throw new Error(COPY.relationshipTypesUnreadable);
    return participantEdges(rows ?? [], types, new Set(personIds));
}
