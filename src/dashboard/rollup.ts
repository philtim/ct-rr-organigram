import type { Leader, OrgNode, Participant } from './types';

/**
 * Unique people across several groups. Leader status takes precedence over
 * participant status: somebody who leads one team and takes part in another
 * counts once, as a leader — so `leaderCount + memberCount` is the number of
 * distinct people and the "Gesamt" tile is not inflated by the overlap.
 */
export function uniqueHeadcount(
    leaderLists: Leader[][],
    participantLists: Participant[][],
): { leaderCount: number; memberCount: number } {
    const leaderIds = new Set(leaderLists.flat().map((l) => l.personId));
    const participantIds = new Set(participantLists.flat().map((p) => p.personId));
    for (const id of leaderIds) participantIds.delete(id);
    return { leaderCount: leaderIds.size, memberCount: participantIds.size };
}

function sumHorizont(nodes: OrgNode[]): number {
    return nodes.reduce((sum, n) => sum + n.horizontCount, 0);
}

/**
 * A Teilstamm's figures, from its teams. `teams` is null when the list of
 * them could not be read.
 *
 * Counted from what loaded, but `incomplete` as soon as anything did not: a
 * total missing a team is not a smaller total, it is no total (CLAUDE.md —
 * never a plausible-looking number for something that could not be read).
 * The Teilstamm's own group failing does not touch these figures, which come
 * from the teams alone; it only costs the card its leader names.
 */
export function rollUpTeilstamm(ts: OrgNode, teams: OrgNode[] | null): OrgNode {
    if (teams === null) {
        return { ...ts, children: [], childrenFailed: true, incomplete: true };
    }
    const loaded = teams.filter((t) => !t.error);
    return {
        ...ts,
        ...uniqueHeadcount(
            loaded.map((t) => t.leaders),
            loaded.map((t) => t.participants),
        ),
        horizontCount: sumHorizont(loaded),
        children: teams,
        // Replaces an errored own group's `incomplete: true`: these figures
        // come from the teams alone. The Hauptstamm checks `ts.error` itself.
        incomplete: loaded.length < teams.length,
    };
}

/**
 * The Hauptstamm's figures, across the whole tree:
 *   Leiter     = Hauptstamm leaders ∪ Teilstamm leaders ∪ every team's leaders
 *   Teilnehmer = unique team participants, minus anyone already a leader
 *
 * `incomplete` when any part of the tree is missing, including a Teilstamm's
 * own group, whose leaders count here.
 */
export function rollUpHauptstamm(
    root: OrgNode,
    teilstaemme: OrgNode[],
    collections: OrgNode[] = [],
): OrgNode {
    const teams = teilstaemme.flatMap((ts) => ts.children).filter((t) => !t.error);
    return {
        ...root,
        ...uniqueHeadcount(
            [
                root.leaders,
                ...teilstaemme.map((ts) => ts.leaders),
                ...teams.map((t) => t.leaders),
                // Sammelgruppen: leaders without a team, counted once like
                // everybody else (leader status already takes precedence).
                ...collections.map((c) => c.leaders),
            ],
            teams.map((t) => t.participants),
        ),
        horizontCount: sumHorizont(teams),
        children: teilstaemme,
        collections,
        incomplete:
            Boolean(root.error) ||
            teilstaemme.some((ts) => Boolean(ts.error) || ts.incomplete) ||
            collections.some((c) => Boolean(c.error)),
    };
}

export type LoadFailure =
    | { kind: 'hauptstamm'; name: string }
    | { kind: 'teilstamm'; name: string }
    | { kind: 'teilstamm-teams'; name: string }
    | { kind: 'team'; name: string; teilstamm: string }
    | { kind: 'sammelgruppe'; name: string };

/** Every part of the tree that could not be read, top-down, for the warning. */
export function loadFailures(root: OrgNode): LoadFailure[] {
    const failures: LoadFailure[] = [];
    if (root.error) failures.push({ kind: 'hauptstamm', name: root.name });
    for (const ts of root.children) {
        // A small Stamm names one group as both; it failed once, say so once.
        const sameAsRoot = ts.groupId === root.groupId;
        if (ts.error && !(sameAsRoot && root.error)) {
            failures.push({ kind: 'teilstamm', name: ts.name });
        }
        if (ts.childrenFailed) failures.push({ kind: 'teilstamm-teams', name: ts.name });
        for (const team of ts.children) {
            if (team.error) failures.push({ kind: 'team', name: team.name, teilstamm: ts.name });
        }
    }
    for (const c of root.collections ?? []) {
        if (c.error) failures.push({ kind: 'sammelgruppe', name: c.name });
    }
    return failures;
}
