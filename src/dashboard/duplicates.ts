import type { OrgNode } from '@/shared/types';

export type DuplicateEntry = {
    personId: number;
    fullName: string;
    teamNames: string[];
};

/**
 * Walk the org tree's team layer and collect every person with
 * `pickPeople(team).length > 0`, recording which teams they belong to.
 * Returns the entries with two or more teams, sorted by name.
 *
 * Errored Teilstämme and errored Teams are skipped — we don't have
 * reliable membership for them.
 */
function collect(
    root: OrgNode,
    pickPeople: (team: OrgNode) => Array<{ personId: number; fullName: string }>,
): DuplicateEntry[] {
    type Acc = { fullName: string; teams: Set<string> };
    const map = new Map<number, Acc>();

    for (const ts of root.children) {
        if (ts.error) continue;
        for (const team of ts.children) {
            if (team.error) continue;
            for (const p of pickPeople(team)) {
                const existing = map.get(p.personId);
                if (existing) {
                    existing.teams.add(team.name);
                } else {
                    map.set(p.personId, {
                        fullName: p.fullName,
                        teams: new Set([team.name]),
                    });
                }
            }
        }
    }

    return Array.from(map.entries())
        .filter(([, acc]) => acc.teams.size > 1)
        .map(([personId, acc]) => ({
            personId,
            fullName: acc.fullName,
            teamNames: Array.from(acc.teams).sort((a, b) => a.localeCompare(b, 'de')),
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'de'));
}

/** Leaders (isLeader=true on a Team group) assigned to more than one team. */
export function findDuplicateLeaders(root: OrgNode): DuplicateEntry[] {
    return collect(root, (team) => team.leaders);
}

/** Non-leader members in more than one team — useful for catching accidental double-assignments. */
export function findDuplicateMembers(root: OrgNode): DuplicateEntry[] {
    return collect(root, (team) => team.participants);
}
