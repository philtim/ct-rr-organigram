import { getGroup, getGroupChildren, getGroupMembers } from './dashboard.api';
import { leadersFromMembers, sumBy } from './counts';
import type { OrgNode } from '@/shared/types';

/**
 * Load an OrgNode for one group: its name, the leaders by name, the team's
 * raw counts (team-level memberCount = total members; leaderCount = members
 * with isLeader role).
 *
 * For non-team levels (Hauptstamm, Teilstamm) the counts produced here are
 * the GROUP'S OWN — caller is responsible for replacing them with the sum
 * of descendant teams (per US-3 acceptance criteria).
 */
async function loadGroupNode(groupId: number): Promise<OrgNode> {
    const [group, members] = await Promise.all([getGroup(groupId), getGroupMembers(groupId)]);
    const leaders = leadersFromMembers(group, members);
    return {
        groupId: group.id,
        name: group.name,
        leaders,
        leaderCount: leaders.length,
        memberCount: members.length,
        children: [],
    };
}

/**
 * Build the three-level organigram rooted at the configured Hauptstamm group.
 *
 * AC-driven aggregation (US-3): Hauptstamm and Teilstamm boxes show
 * leader/member counts SUMMED FROM THEIR TEAMS, not from the group itself.
 * Leader NAMES on each level still come from that level's own membership.
 *
 * Implementation: load the root, its children (Teilstämme), and each of
 * their children (Teams) in a wave-by-wave parallel fan-out. The fan-out
 * is bounded by the Promise.all at each level.
 */
export async function loadOrganigram(rootGroupId: number): Promise<OrgNode> {
    const [root, rootChildren] = await Promise.all([
        loadGroupNode(rootGroupId),
        getGroupChildren(rootGroupId),
    ]);

    const teilstaemme: OrgNode[] = await Promise.all(
        rootChildren.map(async (child) => {
            const tsId = parseInt(child.domainIdentifier, 10);
            const [ts, tsChildren] = await Promise.all([
                loadGroupNode(tsId),
                getGroupChildren(tsId),
            ]);

            const teams: OrgNode[] = await Promise.all(
                tsChildren.map((teamChild) =>
                    loadGroupNode(parseInt(teamChild.domainIdentifier, 10)),
                ),
            );

            return {
                ...ts,
                leaderCount: sumBy(teams, (t) => t.leaderCount),
                memberCount: sumBy(teams, (t) => t.memberCount),
                children: teams,
            };
        }),
    );

    return {
        ...root,
        leaderCount: sumBy(teilstaemme, (ts) => ts.leaderCount),
        memberCount: sumBy(teilstaemme, (ts) => ts.memberCount),
        children: teilstaemme,
    };
}
