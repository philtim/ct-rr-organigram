import type { GroupChild } from './dashboard.api';
import { getGroup, getGroupChildren, getGroupMembers } from './dashboard.api';
import { leadersFromMembers, participantsFromMembers } from './counts';
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
        participants: [],
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
        const participants = participantsFromMembers(group, members);
        return {
            groupId: group.id,
            name: group.name,
            leaders,
            participants,
            // Team-level display values: this group's own counts. Higher
            // levels overwrite these with deduped unions in loadOrganigram.
            leaderCount: leaders.length,
            memberCount: participants.length,
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
export async function loadOrganigram(
    rootGroupId: number,
    teilstammIds?: number[],
): Promise<OrgNode> {
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

    // If the admin picked specific Teilstämme, walk only those. Undefined
    // means "no explicit selection yet" → keep legacy behavior so existing
    // installations don't break before they've been reconfigured.
    const teilstammIdSet = teilstammIds ? new Set(teilstammIds) : null;
    const selectedRootChildren = teilstammIdSet
        ? rootChildren.filter((c) => teilstammIdSet.has(parseInt(c.domainIdentifier, 10)))
        : rootChildren;

    const teilstaemme: OrgNode[] = await Promise.all(
        selectedRootChildren.map(async (child) => {
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

            // Teilstamm children may include operational/Maßnahme groups
            // alongside the actual Kleingruppen-Teams. Only Kleingruppen
            // (groupTypeId=1) render as team chips and feed into the counts.
            const teamChildren = tsChildren.filter(
                (c) => c.domainAttributes.groupTypeId === 1,
            );

            const teams: OrgNode[] = await Promise.all(
                teamChildren.map((teamChild) =>
                    safeLoadGroupNode(
                        parseInt(teamChild.domainIdentifier, 10),
                        teamChild.title,
                    ),
                ),
            );

            // Teilstamm aggregation: unique persons across teams.
            // A person who leads two teams (or is a member of two) under
            // the same Teilstamm is counted once. Leader status takes
            // precedence over participant status — if the same person
            // leads one team and is a participant in another, they only
            // count as a leader (so leaderCount + memberCount == unique
            // persons, no double-count on the "Gesamt" tile).
            const okTeams = teams.filter((t) => !t.error);
            const tsLeaderIds = new Set<number>();
            const tsParticipantIds = new Set<number>();
            for (const team of okTeams) {
                for (const l of team.leaders) tsLeaderIds.add(l.personId);
                for (const p of team.participants) tsParticipantIds.add(p.personId);
            }
            for (const id of tsLeaderIds) tsParticipantIds.delete(id);
            return {
                ...ts,
                leaderCount: tsLeaderIds.size,
                memberCount: tsParticipantIds.size,
                children: teams,
            };
        }),
    );

    // Hauptstamm aggregation: unique persons across the whole tree.
    //   Leiter     = (Hauptstamm leaders) ∪ (Teilstamm-MA leaders) ∪ (every team's leaders)
    //   Mitglieder = unique team participants minus anyone already in Leiter
    // Leader status takes precedence over participant status, matching
    // the auto-membership rule of "RR Mitarbeiter" and the existing
    // DuplicatesPanel semantics. With the precedence applied,
    // leaderCount + memberCount equals the unique-person count and the
    // "Gesamt" tile is no longer inflated by leader-on-A / participant-
    // on-B overlaps.
    const okTs = teilstaemme.filter((ts) => !ts.error);
    const allLeaderIds = new Set<number>();
    const allParticipantIds = new Set<number>();
    for (const l of root.leaders) allLeaderIds.add(l.personId);
    for (const ts of okTs) {
        for (const l of ts.leaders) allLeaderIds.add(l.personId);
        for (const team of ts.children) {
            if (team.error) continue;
            for (const l of team.leaders) allLeaderIds.add(l.personId);
            for (const p of team.participants) allParticipantIds.add(p.personId);
        }
    }
    for (const id of allLeaderIds) allParticipantIds.delete(id);
    return {
        ...root,
        leaderCount: allLeaderIds.size,
        memberCount: allParticipantIds.size,
        children: teilstaemme,
    };
}

/** Recursively check whether any node in the tree was loaded with an error. */
export function hasAnyError(node: OrgNode): boolean {
    if (node.error) return true;
    return node.children.some(hasAnyError);
}
