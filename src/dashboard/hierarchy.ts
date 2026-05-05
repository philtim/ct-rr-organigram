import type { GroupChild } from './dashboard.api';
import { getGroup, getGroupChildren, getGroupMembers } from './dashboard.api';
import { leadersFromMembers, sumBy } from './counts';
import { API_TIMEOUT_MS } from '@/shared/constants';
import type { OrgNode } from '@/shared/types';

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
function errorNode(groupId: number, fallbackName: string): OrgNode {
    return {
        groupId,
        name: fallbackName,
        leaders: [],
        leaderCount: 0,
        memberCount: 0,
        children: [],
        error: 'fetch-failed',
    };
}

/**
 * Load one group + its members. On any failure (non-2xx, network, timeout)
 * return an OrgNode with error='fetch-failed' instead of throwing — the
 * dashboard remains functional and the failed boxes render as "?".
 */
async function safeLoadGroupNode(groupId: number, fallbackName = '?'): Promise<OrgNode> {
    try {
        const [group, members] = await Promise.all([
            withTimeout(getGroup(groupId)),
            withTimeout(getGroupMembers(groupId)),
        ]);
        const leaders = leadersFromMembers(group, members);
        return {
            groupId: group.id,
            name: group.name,
            leaders,
            leaderCount: leaders.length,
            memberCount: members.length,
            children: [],
        };
    } catch (e) {
        console.error(`[rr-dashboard] failed to load group ${groupId}:`, e);
        return errorNode(groupId, fallbackName);
    }
}

/** Soft children fetch — returns null on failure so caller can short-circuit. */
async function safeGetChildren(groupId: number): Promise<GroupChild[] | null> {
    try {
        return await withTimeout(getGroupChildren(groupId));
    } catch (e) {
        console.error(`[rr-dashboard] failed to load children of group ${groupId}:`, e);
        return null;
    }
}

/**
 * Build the three-level organigram rooted at the configured Hauptstamm group.
 *
 * Per US-5: individual API failures degrade gracefully. A failed group
 * load becomes a node with error='fetch-failed' (rendered as "?" by the
 * cards). A failed children-list call leaves the parent without team
 * children and marks it errored so the Teilstamm card shows "Teams
 * konnten nicht geladen werden".
 *
 * Per US-3 AC: Hauptstamm and Teilstamm leader/member COUNTS are summed
 * from descendant teams (errored teams contribute 0 to the sum but the
 * sum itself remains usable on partially-failed loads). Leader NAMES on
 * each level still come from that level's own membership.
 */
export async function loadOrganigram(rootGroupId: number): Promise<OrgNode> {
    const [root, rootChildren] = await Promise.all([
        safeLoadGroupNode(rootGroupId),
        safeGetChildren(rootGroupId),
    ]);

    if (rootChildren === null) {
        // We couldn't find out who the Teilstämme are — render the root
        // with whatever data we got and mark it errored so the dashboard
        // shows the toast and (if the root load failed too) "?".
        return {
            ...root,
            error: root.error ?? 'fetch-failed',
            children: [],
        };
    }

    const teilstaemme: OrgNode[] = await Promise.all(
        rootChildren.map(async (child) => {
            const tsId = parseInt(child.domainIdentifier, 10);
            const [ts, tsChildren] = await Promise.all([
                safeLoadGroupNode(tsId, child.title),
                safeGetChildren(tsId),
            ]);

            if (tsChildren === null) {
                return {
                    ...ts,
                    error: ts.error ?? 'fetch-failed',
                    children: [],
                };
            }

            const teams: OrgNode[] = await Promise.all(
                tsChildren.map((teamChild) =>
                    safeLoadGroupNode(
                        parseInt(teamChild.domainIdentifier, 10),
                        teamChild.title,
                    ),
                ),
            );

            const okTeams = teams.filter((t) => !t.error);
            return {
                ...ts,
                leaderCount: sumBy(okTeams, (t) => t.leaderCount),
                memberCount: sumBy(okTeams, (t) => t.memberCount),
                children: teams,
            };
        }),
    );

    // Hauptstamm leader count covers EVERY leader role across the org
    // tree: the Hauptstamm group's own Leiter+Co-Leiter, each Teilstamm's
    // own Stammleiter/Stammwart (ts.leaders.length), and the team-level
    // total that's already rolled into ts.leaderCount.
    const okTs = teilstaemme.filter((ts) => !ts.error);
    const hauptstammOwn = root.leaders.length;
    const teilstaemmeAndTeams = sumBy(okTs, (ts) => ts.leaders.length + ts.leaderCount);
    return {
        ...root,
        leaderCount: hauptstammOwn + teilstaemmeAndTeams,
        memberCount: sumBy(okTs, (ts) => ts.memberCount),
        children: teilstaemme,
    };
}

/** Recursively check whether any node in the tree was loaded with an error. */
export function hasAnyError(node: OrgNode): boolean {
    if (node.error) return true;
    return node.children.some(hasAnyError);
}
