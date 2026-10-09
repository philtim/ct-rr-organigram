import type { GroupChild } from './dashboard.api';
import { getGroup, getGroupChildren, getGroupMembers } from './dashboard.api';
import {
    horizontCountFromMembers,
    leadersFromMembers,
    leaderRolesOf,
    participantsFromMembers,
    sumBy,
} from './counts';
import { API_TIMEOUT_MS } from '@/shared/constants';
import type { Settings } from '@/shared/settings';
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
        leaderRoles: [],
        participants: [],
        leaderCount: 0,
        memberCount: 0,
        horizontCount: 0,
        children: [],
        error: 'fetch-failed',
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
    fallbackName = '?',
): Promise<OrgNode> {
    try {
        const [group, members] = await Promise.all([
            withTimeout(getGroup(groupId)),
            withTimeout(getGroupMembers(groupId)),
        ]);
        const extra = new Set(settings.extraLeaderRoleIds);
        const leaders = leadersFromMembers(group, members, extra);
        const participants = participantsFromMembers(group, members, extra);
        return {
            groupId: group.id,
            name: group.name,
            leaders,
            leaderRoles: leaderRolesOf(group),
            participants,
            // Team-level display values: this group's own counts. Higher
            // levels overwrite these with deduped unions in loadOrganigram.
            leaderCount: leaders.length,
            memberCount: participants.length,
            horizontCount: horizontCountFromMembers(members, settings.horizontFieldName),
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
export async function loadOrganigram(settings: Settings): Promise<OrgNode> {
    const rootGroupId = settings.gateGroupId;
    if (rootGroupId === null) throw new Error('Keine Hauptstamm-Gruppe konfiguriert.');

    const root = await safeLoadGroupNode(rootGroupId, settings);

    // The Teilstämme are configured directly, not derived from the
    // Hauptstamm's children. That is what lets a small Stamm name the same
    // group as Hauptstamm and as its only Teilstamm — a group is not its own
    // child, so the old children-based lookup came back empty for them.
    const teamTypeIds = new Set(settings.teamGroupTypeIds);

    const teilstaemme: OrgNode[] = await Promise.all(
        settings.teilstammIds.map(async (tsId) => {
            const [ts, tsChildren] = await Promise.all([
                safeLoadGroupNode(tsId, settings),
                safeGetChildren(tsId),
            ]);

            if (tsChildren === null) {
                return {
                    ...ts,
                    error: ts.error ?? 'fetch-failed',
                    children: [],
                };
            }

            // A Teilstamm's children may include operational groups,
            // Maßnahmen or Merkmale alongside the actual teams. Which types
            // count is configuration — the admin ticks them off a list of
            // what is actually there (docs/design/002-konfigurierbarkeit.md).
            const teamChildren = tsChildren.filter((c) =>
                teamTypeIds.has(c.domainAttributes.groupTypeId),
            );

            const teams: OrgNode[] = await Promise.all(
                teamChildren.map((teamChild) =>
                    safeLoadGroupNode(
                        parseInt(teamChild.domainIdentifier, 10),
                        settings,
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
                horizontCount: sumBy(okTeams, (t) => t.horizontCount),
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
        horizontCount: sumBy(okTs, (ts) => ts.horizontCount),
        children: teilstaemme,
    };
}

/** Recursively check whether any node in the tree was loaded with an error. */
export function hasAnyError(node: OrgNode): boolean {
    if (node.error) return true;
    return node.children.some(hasAnyError);
}
