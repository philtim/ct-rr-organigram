import { ct, mapWithConcurrency, withRetryOn429 } from '@/shared/api';
import { ageBucket, todayUtc } from '@/shared/dates';
import {
    fetchActiveMembers,
    getChildGroups,
    personFieldsOf,
    personIdOf,
    teamsAmong,
} from '@/shared/groups.api';
import { COPY } from '@/shared/copy';
import { fetchLeaderRoleIds } from '@/shared/roles';
import type { LeaderRoleIds } from '@/shared/roles';
import { genderOf } from './tally';
import type { RowDef, ScopedPerson } from './tally';
import type { Settings } from '@/shared/settings';
import type { GroupMember } from '@/shared/types';

/**
 * The only two person fields this view reads, and both are reduced to an enum
 * before they leave this module (ADR-013). Nothing downstream receives a date
 * of birth or a raw `sexId`.
 */
const PERSON_FIELDS = ['birthday', 'sexId'] as const;

export type ScopeLoad = {
    people: ScopedPerson[];
    /** One per configured Teilstamm, in the order ChurchTools lists them. */
    rows: RowDef[];
    /** True when the Hauptstamm or a Teilstamm-MA group failed to load. */
    ohneTeamIncomplete: boolean;
    /** How many team groups the figures cover — the scope, made visible. */
    teamCount: number;
};

/** A group's display name, for the row label. Null when it cannot be read. */
async function getGroupTitle(groupId: number): Promise<string | null> {
    try {
        const group = await withRetryOn429(() => ct.get<{ name?: string }>(`/groups/${groupId}`));
        return group?.name ?? null;
    } catch (e) {
        console.error(`[rr-dashboard] Jahresmeldung: group ${groupId} name unavailable:`, e);
        return null;
    }
}

/** A soft fetch: a failure costs one group's members, not the whole table. */
async function safeGetMembers(groupId: number): Promise<GroupMember[] | null> {
    try {
        return await fetchActiveMembers<GroupMember>(groupId, PERSON_FIELDS);
    } catch (e) {
        console.error(`[rr-dashboard] Jahresmeldung: group ${groupId} failed to load:`, e);
        return null;
    }
}

/** ChurchTools' own person link, taken as given rather than constructed (ADR-013). */
function frontendUrlOf(member: GroupMember): string | null {
    const url = member.person?.frontendUrl;
    return typeof url === 'string' && url.length > 0 ? url : null;
}

/**
 * Accumulates people across every group in scope, merging the memberships of
 * anyone who appears more than once.
 *
 * The reduction from `birthday`/`sexId` to `age`/`gender` happens here, on
 * arrival, and the originals are not kept. This is the single place in the
 * feature that sees either, which is what makes ADR-013's boundary reviewable.
 */
function createAccumulator(leaderRoleIds: LeaderRoleIds, today: Date) {
    const byId = new Map<number, ScopedPerson>();

    function add(members: GroupMember[], teilstammId: number | null, isTeam: boolean): void {
        for (const member of members) {
            const personId = personIdOf(member);
            if (personId === null) continue;

            const fields = personFieldsOf(member);
            const leads = leaderRoleIds.has(member.groupTypeRoleId);

            let person = byId.get(personId);
            if (!person) {
                const { gender, genderGap } = genderOf(fields.sexId as number | null | undefined);
                person = {
                    personId,
                    name: member.person?.title ?? '',
                    frontendUrl: frontendUrlOf(member),
                    gender,
                    genderGap,
                    isLeader: false,
                    age: ageBucket(fields.birthday as string | null | undefined, today),
                    teamTeilstammIds: [],
                    leaderTeilstammIds: [],
                };
                byId.set(personId, person);
            }

            // Leading anywhere in scope makes someone a leader everywhere in
            // it — the precedence the organigram's roll-up applies too.
            if (leads) person.isLeader = true;

            if (isTeam && teilstammId !== null) {
                if (!person.teamTeilstammIds.includes(teilstammId)) {
                    person.teamTeilstammIds.push(teilstammId);
                }
                if (leads && !person.leaderTeilstammIds.includes(teilstammId)) {
                    person.leaderTeilstammIds.push(teilstammId);
                }
            }
        }
    }

    return { add, all: () => [...byId.values()] };
}

/**
 * Everyone in the configured scope, reduced to what the table needs.
 *
 * Partial failures degrade the way US-5 established for the organigram, but
 * one step more cautiously: a Teilstamm whose team could not be read is
 * marked, and the view blanks that row *and every total* rather than showing a
 * number that is quietly too low. For a figure that gets filed with the Bund,
 * a missing answer is cheaper than a plausible wrong one.
 */
export async function loadJahresmeldung(
    settings: Settings,
    today: Date = todayUtc(),
): Promise<ScopeLoad> {
    const gateGroupId = settings.gateGroupId;
    if (gateGroupId === null) throw new Error(COPY.noHauptstamm);

    const leaderRoleIds = await fetchLeaderRoleIds(new Set(settings.extraLeaderRoleIds));

    // The Teilstämme are configured directly; their labels come from
    // ChurchTools, in the configured order. No group name is hardcoded.
    const teilstaemme = await mapWithConcurrency(settings.teilstammIds, 4, async (id) => ({
        id,
        label: (await getGroupTitle(id)) ?? String(id),
    }));

    const accumulator = createAccumulator(leaderRoleIds, today);
    let ohneTeamIncomplete = false;

    const hauptstammMembers = await safeGetMembers(gateGroupId);
    if (hauptstammMembers === null) ohneTeamIncomplete = true;
    else accumulator.add(hauptstammMembers, null, false);

    const loaded = await mapWithConcurrency(teilstaemme, 4, async (ts) => {
        let incomplete = false;

        const [ownMembers, children] = await Promise.all([
            safeGetMembers(ts.id),
            getChildGroups(ts.id).catch((e) => {
                console.error(`[rr-dashboard] Jahresmeldung: children of ${ts.id} failed:`, e);
                return null;
            }),
        ]);

        // A Teilstamm-MA group feeds the "ohne Team" row, not this one, so
        // losing it is an "ohne Team" problem rather than a row problem.
        if (ownMembers === null) ohneTeamIncomplete = true;

        const teamIds =
            children === null
                ? []
                : teamsAmong(children, settings.teamGroupTypeIds).map((c) => c.id);
        if (children === null) incomplete = true;

        const teams = await mapWithConcurrency(teamIds, 6, async (teamId) => ({
            teamId,
            members: await safeGetMembers(teamId),
        }));

        return { ts, ownMembers, teams, incomplete };
    });

    // Added after the fetches so the accumulator is written from one place in
    // one order — concurrent mutation of the same person is how double counts
    // get in.
    const rows: RowDef[] = [];
    let teamCount = 0;
    for (const { ts, ownMembers, teams, incomplete } of loaded) {
        let rowIncomplete = incomplete;
        if (ownMembers) accumulator.add(ownMembers, ts.id, false);
        for (const { members } of teams) {
            if (members === null) rowIncomplete = true;
            else {
                accumulator.add(members, ts.id, true);
                teamCount += 1;
            }
        }
        rows.push({ teilstammId: ts.id, label: ts.label, incomplete: rowIncomplete });
    }

    return { people: accumulator.all(), rows, ohneTeamIncomplete, teamCount };
}
