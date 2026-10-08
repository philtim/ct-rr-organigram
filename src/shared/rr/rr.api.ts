import { ct } from '@/shared/api';
import type { GroupMember } from '@/shared/types';
import type { Relationship, RrParticipant } from './types';

/** `groupTypeRoleId` of "Teilnehmer" in a Kleingruppe (group type 1). */
export const TEILNEHMER_ROLE_ID = 8;

/** Kleingruppe — the group type the actual RR teams use. */
const KLEINGRUPPE_TYPE_ID = 1;

/** Person fields the export needs. Requested inline so no /persons calls follow. */
const PERSON_FIELDS = ['birthday', 'street', 'zip', 'city'] as const;

export type TeamRef = { groupId: number; name: string };

type GroupChildRow = {
    title: string;
    domainIdentifier: string;
    domainAttributes?: { groupTypeId?: number };
};

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
export async function resolveTeams(teilstammIds: number[]): Promise<TeamRef[]> {
    const perTeilstamm = await mapWithConcurrency(teilstammIds, 4, async (teilstammId) => {
        const children = await ct.get<GroupChildRow[]>(`/groups/${teilstammId}/children`);
        return (children ?? []).filter(
            (child) => child.domainAttributes?.groupTypeId === KLEINGRUPPE_TYPE_ID,
        );
    });

    const byId = new Map<number, TeamRef>();
    for (const children of perTeilstamm) {
        for (const child of children) {
            const groupId = Number(child.domainIdentifier);
            if (!Number.isFinite(groupId) || byId.has(groupId)) continue;
            byId.set(groupId, { groupId, name: child.title });
        }
    }
    return [...byId.values()];
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
 * Both come from the same response on purpose. Asking the server twice — once
 * with `role_ids[]=8` and once without — would double the request count for an
 * answer already in hand.
 *
 * **Staff is derived from roles, not from the "RR Mitarbeiter" Merkmal group.**
 * That group is auto-populated from exactly these memberships, so the two
 * agree (checked against the live instance: both yield the same 17 people, no
 * difference either way), and deriving it needs no installation-specific group
 * id in the source or in the configuration.
 *
 * Someone can be a participant in more than one team, so results are merged by
 * person id and the team names collected — otherwise they would be counted
 * twice and billed twice.
 */
export async function fetchTeamMembers(teams: TeamRef[]): Promise<TeamMembers> {
    const byPerson = new Map<number, RrParticipant>();
    const staffPersonIds = new Set<number>();

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

            if (member.groupTypeRoleId !== TEILNEHMER_ROLE_ID) {
                staffPersonIds.add(personId);
                continue;
            }

            const existing = byPerson.get(personId);
            if (existing) {
                if (!existing.teamNames.includes(team.name)) existing.teamNames.push(team.name);
                continue;
            }
            byPerson.set(personId, toParticipant(personId, member, team.name));
        }
    }

    for (const participant of byPerson.values()) participant.teamNames.sort();
    return { participants: [...byPerson.values()], staffPersonIds };
}

function memberQuery(): string {
    const params = new URLSearchParams();
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
export async function fetchStaffFromGroups(groupIds: number[]): Promise<Set<number>> {
    const ids = new Set<number>();
    const pages = await mapWithConcurrency(groupIds, 4, (groupId) =>
        ct.get<GroupMember[]>(
            `/groups/${groupId}/members?group_member_statuses[]=active&limit=200`,
        ),
    );
    for (const members of pages) {
        for (const member of members ?? []) {
            const personId = Number(member.person?.domainIdentifier);
            if (Number.isFinite(personId)) ids.add(personId);
        }
    }
    return ids;
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

    const perPerson = await mapWithConcurrency(personIds, 4, async (personId) => {
        const rows = await withRetryOn429(() =>
            ct.get<RelationshipRow[]>(`/persons/${personId}/relationships`),
        );
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
 * Retry a request that came back HTTP 429, with increasing delays.
 *
 * Opening this tab asks about every participant individually, which is some
 * 300 requests. The live instance answers them, but rate-limits a second run
 * in quick succession — observed during verification, not theorised. Without
 * this, a reload would show "could not be loaded" and the user would have no
 * idea that waiting a moment is the fix.
 *
 * Only 429 is retried. Every other failure is a real failure and is raised
 * straight away rather than hidden behind three slow attempts.
 */
async function withRetryOn429<T>(call: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await call();
        } catch (e) {
            if (attempt >= attempts || statusOf(e) !== 429) throw e;
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
    }
}

function statusOf(e: unknown): number | undefined {
    if (typeof e === 'object' && e !== null) {
        const maybe = e as { response?: { status?: number }; status?: number };
        return maybe.response?.status ?? maybe.status;
    }
    return undefined;
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
