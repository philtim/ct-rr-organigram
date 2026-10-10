import { getGroup, getGroupMembers } from './dashboard.api';
import { horizontCountFromMembers, leaderRolesOf, splitMembers } from './counts';
import { rollUpHauptstamm, rollUpTeilstamm } from './rollup';
import { mapWithConcurrency } from '@/shared/api';
import { getChildGroups, teamsAmong } from '@/shared/groups.api';
import type { ChildGroup } from '@/shared/groups.api';
import { API_TIMEOUT_MS } from '@/shared/constants';
import { COPY } from '@/shared/copy';
import type { Settings } from '@/shared/settings';
import type { OrgNode } from './types';

/**
 * Wrap any promise in a 30-second hard deadline (US-5 NFR). The PRD says
 * the dashboard waits at most 30s per call before treating the call as
 * failed and rendering "?".
 */
function withTimeout<T>(p: Promise<T>, ms: number = API_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
        p.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            },
        );
    });
}

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
): Promise<OrgNode> {
    try {
        const [group, members] = await Promise.all([
            withTimeout(getGroup(groupId)),
            withTimeout(getGroupMembers(groupId)),
        ]);
        const { leaders, participants } = splitMembers(
            group,
            members,
            new Set(settings.extraLeaderRoleIds),
        );
        return {
            groupId: group.id,
            name: group.name,
            leaders,
            leaderRoles: leaderRolesOf(group),
            participants,
            // Team-level display values: this group's own counts. Higher
            // levels overwrite these with deduped unions (rollup.ts).
            leaderCount: leaders.length,
            memberCount: participants.length,
            horizontCount: horizontCountFromMembers(members, settings.horizontFieldName),
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
        return await withTimeout(getChildGroups(groupId));
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

    return rollUpHauptstamm(root, teilstaemme);
}
