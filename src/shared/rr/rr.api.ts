import { ct } from '@/shared/api';
import type { GroupMember } from '@/shared/types';
import type { Relationship, RrParticipant } from './types';

/** `groupTypeRoleId` of "Teilnehmer" in a Kleingruppe (group type 1). */
export const TEILNEHMER_ROLE_ID = 8;

/** Person fields the export needs. Requested inline so no /persons calls follow. */
const PERSON_FIELDS = ['birthday', 'street', 'zip', 'city'] as const;

export type TeamRef = { groupId: number; name: string };

/**
 * Active participants of the given team groups, one request per team, with
 * person fields inlined.
 *
 * Someone can be a participant in more than one team, so results are merged
 * by person id and the team names collected — otherwise they would be counted
 * twice and billed twice.
 */
export async function fetchTeamParticipants(teams: TeamRef[]): Promise<RrParticipant[]> {
    const byPerson = new Map<number, RrParticipant>();

    const pages = await mapWithConcurrency(teams, 6, async (team) => ({
        team,
        members: await ct.get<GroupMember[]>(`/groups/${team.groupId}/members?${memberQuery()}`),
    }));

    for (const { team, members } of pages) {
        for (const member of members ?? []) {
            // `member.personId` exists but is deprecated in favour of this;
            // recon found `person.domainIdentifier` populated on every row.
            const personId = Number(member.person?.domainIdentifier);
            if (!Number.isFinite(personId)) continue;

            const existing = byPerson.get(personId);
            if (existing) {
                if (!existing.teamNames.includes(team.name)) existing.teamNames.push(team.name);
                continue;
            }
            byPerson.set(personId, toParticipant(personId, member, team.name));
        }
    }

    for (const participant of byPerson.values()) participant.teamNames.sort();
    return [...byPerson.values()];
}

function memberQuery(): string {
    const params = new URLSearchParams();
    params.append('role_ids[]', String(TEILNEHMER_ROLE_ID));
    params.append('group_member_statuses[]', 'active');
    for (const field of PERSON_FIELDS) params.append('personFields[]', field);
    params.set('limit', '200');
    return params.toString();
}

function toParticipant(personId: number, member: GroupMember, teamName: string): RrParticipant {
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
        teamNames: [teamName],
    };
}

/**
 * `personFields` is typed as an array but the live API answers with a plain
 * object (`{birthday, street, …}`). Accept either rather than depend on which.
 */
function personFieldsOf(member: GroupMember): Record<string, unknown> {
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

/**
 * Person ids in the "RR Mitarbeiter" Merkmal group — the participants who are
 * themselves Mitarbeiter and therefore exempt. This is the person's own
 * status; their parents' is irrelevant and never consulted.
 */
export async function fetchStaffPersonIds(groupId: number): Promise<Set<number>> {
    const members = await ct.get<GroupMember[]>(`/groups/${groupId}/members?limit=200`);
    const ids = new Set<number>();
    for (const member of members ?? []) {
        const id = Number(member.person?.domainIdentifier);
        if (Number.isFinite(id)) ids.add(id);
    }
    return ids;
}

const RELATIONSHIP_PARENT_CHILD = 1;
const RELATIONSHIP_SIBLING = 3;

/**
 * Relationships for the given people, one request each.
 *
 * Recon note, so nobody retries the obvious shortcut: the bulk endpoint
 * `GET /persons/relationships` ignores `limit` and `page` and accepts no
 * person filter under any spelling. It answers with every relationship in the
 * installation — 5,940 rows, 4.3 MB on the live instance. Fetching per person
 * costs more requests but about 450 KB, and asks only about the people whose
 * fees are being computed.
 *
 * `degreeOfRelationship === 'relationship.part.parent'` means the *relative*
 * is the parent of the person asked about. (Recon-confirmed: the bulk feed
 * states the same edge as personA = parent, personB = child.)
 */
export async function fetchRelationships(personIds: number[]): Promise<Relationship[]> {
    type RelationshipRow = {
        relationshipTypeId?: number;
        degreeOfRelationship?: string;
        relative?: { domainIdentifier?: string };
    };

    const perPerson = await mapWithConcurrency(personIds, 8, async (personId) => {
        const rows = await ct.get<RelationshipRow[]>(`/persons/${personId}/relationships`);
        return { personId, rows: rows ?? [] };
    });

    const relationships: Relationship[] = [];
    for (const { personId, rows } of perPerson) {
        for (const row of rows) {
            const relativeId = Number(row.relative?.domainIdentifier);
            if (!Number.isFinite(relativeId)) continue;

            if (
                row.relationshipTypeId === RELATIONSHIP_PARENT_CHILD &&
                row.degreeOfRelationship === 'relationship.part.parent'
            ) {
                relationships.push({ personId, relativeId, kind: 'parent' });
            } else if (row.relationshipTypeId === RELATIONSHIP_SIBLING) {
                relationships.push({ personId, relativeId, kind: 'sibling' });
            }
        }
    }
    return relationships;
}

/**
 * Bounded-concurrency map. 300-odd requests fired at once would be throttled
 * by the browser and unkind to the instance; a handful in flight is plenty.
 */
async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        for (;;) {
            const index = next++;
            if (index >= items.length) return;
            results[index] = await fn(items[index]);
        }
    });

    await Promise.all(workers);
    return results;
}
