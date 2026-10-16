import { getGroup, getGroupMembers } from './dashboard.api';
import { hasMemberField, horizontCountFromMembers, leaderRolesOf, splitMembers } from './counts';
import { leaderRuleOf } from '@/shared/roles';
import { rollUpHauptstamm, rollUpTeilstamm } from './rollup';
import { mapWithConcurrency } from '@/shared/api';
import { getChildGroups, teamsAmong } from '@/shared/groups.api';
import type { ChildGroup } from '@/shared/groups.api';
import { COPY } from '@/shared/copy';
import type { Settings } from '@/shared/settings';
import type { OrgNode } from './types';

/** Make an empty error node so the renderer can show "?" in place of real data. */
function errorNode(groupId: number, fallbackName: string | undefined): OrgNode {
    return {
        groupId,
        // A name nobody can place is worse than the id the admin configured.
        name: fallbackName ?? COPY.groupFallbackName(groupId),
        leaders: [],
        leaderRoles: [],
        participants: [],
        leaderCount: 0,
        memberCount: 0,
        horizontCount: 0,
        children: [],
        error: 'fetch-failed',
        incomplete: true,
    };
}

/**
 * Load one group + its members. On any failure (non-2xx, network, timeout)
 * return an OrgNode with error='fetch-failed' instead of throwing — the
 * dashboard remains functional and the failed boxes render as "?".
 */
async function safeLoadGroupNode(
    groupId: number,
    settings: Settings,
    fallbackName?: string,
    everyoneLeads = false,
): Promise<OrgNode> {
    try {
        const [group, members] = await Promise.all([getGroup(groupId), getGroupMembers(groupId)]);
        const rule = leaderRuleOf(settings);
        // A Sammelgruppe exists for leaders: every member of it counts as one.
        const { leaders, participants } = splitMembers(group, members, rule, everyoneLeads);
        return {
            groupId: group.id,
            name: group.name,
            leaders,
            leaderRoles: leaderRolesOf(group, rule),
            participants,
            // Team-level display values: this group's own counts. Higher
            // levels overwrite these with deduped unions (rollup.ts).
            leaderCount: leaders.length,
            memberCount: participants.length,
            horizontCount: horizontCountFromMembers(members, settings.horizontFieldName),
            horizontFieldSeen: hasMemberField(members, settings.horizontFieldName),
            children: [],
            incomplete: false,
        };
    } catch (e) {
        console.error(`[rr-dashboard] failed to load group ${groupId}:`, e);
        return errorNode(groupId, fallbackName);
    }
}

/** Soft children fetch — returns null on failure so caller can short-circuit. */
async function safeGetChildren(groupId: number): Promise<ChildGroup[] | null> {
    try {
        return await getChildGroups(groupId);
    } catch (e) {
        console.error(`[rr-dashboard] failed to load children of group ${groupId}:`, e);
        return null;
    }
}

/**
 * Requests in flight at once. Every team costs a group read and its member
 * pages; firing all of them together is what trips the instance's rate limit
 * on a second load, and the other tabs settled on the same bound.
 */
const CONCURRENCY = 6;

/**
 * Build the three-level organigram rooted at the configured Hauptstamm group.
 *
 * Per US-5, individual failures degrade gracefully: a group that cannot be
 * read becomes a node with error='fetch-failed', and a Teilstamm whose teams
 * cannot be listed is marked `childrenFailed`. The figures above any such gap
 * are marked `incomplete` (see rollup.ts) — the rest of the tree still shows.
 */
export async function loadOrganigram(settings: Settings): Promise<OrgNode> {
    const rootGroupId = settings.gateGroupId;
    if (rootGroupId === null) throw new Error(COPY.noHauptstamm);

    // The Teilstämme are configured directly, not derived from the
    // Hauptstamm's children. That is what lets a small Stamm name the same
    // group as Hauptstamm and as its only Teilstamm — a group is not its own
    // child, so a children-based lookup comes back empty for them.
    //
    // Deduplicated: the admin's picker cannot produce a repeat, but a
    // hand-edited KV entry can, and it would render the same card twice under
    // a colliding key.
    const teilstammIds = [...new Set(settings.teilstammIds)];

    const collectionIds = [...new Set(settings.collectionGroupIds)];
    const collectionsLoad = mapWithConcurrency(collectionIds, CONCURRENCY, (id) =>
        safeLoadGroupNode(id, settings, undefined, true),
    );

    const [root, ...teilstaemme] = await Promise.all([
        safeLoadGroupNode(rootGroupId, settings),
        ...teilstammIds.map(async (tsId) => {
            const [ts, tsChildren] = await Promise.all([
                safeLoadGroupNode(tsId, settings),
                safeGetChildren(tsId),
            ]);
            if (tsChildren === null) return rollUpTeilstamm(ts, null);

            // A Teilstamm's children may include operational groups,
            // Maßnahmen or Merkmale alongside the actual teams. Which types
            // count is configuration — the admin ticks them off a list of
            // what is actually there (docs/design/002-konfigurierbarkeit.md).
            const teams = await mapWithConcurrency(
                teamsAmong(tsChildren, settings.teamGroupTypeIds),
                CONCURRENCY,
                (team) => safeLoadGroupNode(team.id, settings, team.title),
            );
            return rollUpTeilstamm(ts, teams);
        }),
    ]);

    return rollUpHauptstamm(root, teilstaemme, await collectionsLoad);
}
