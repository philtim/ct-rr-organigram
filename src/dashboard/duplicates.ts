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

export type MixedAssignmentEntry = {
    personId: number;
    fullName: string;
    leaderTeams: string[];
    participantTeams: string[];
};

/**
 * Persons who appear as a leader in at least one team AND as a
 * participant in at least one other team. The Hauptstamm/Teilstamm
 * stat tiles give leader-status precedence, so these people are
 * counted as Leiter — but they still represent a cross-class double
 * assignment a Stammleiter might want to clean up (typically a
 * Teamleader who is also enrolled as a Pfadranger in their own
 * age-group team).
 */
export function findMixedAssignments(root: OrgNode): MixedAssignmentEntry[] {
    type Acc = { fullName: string; leaderTeams: Set<string>; participantTeams: Set<string> };
    const map = new Map<number, Acc>();

    const get = (personId: number, fullName: string): Acc => {
        const existing = map.get(personId);
        if (existing) return existing;
        const fresh: Acc = { fullName, leaderTeams: new Set(), participantTeams: new Set() };
        map.set(personId, fresh);
        return fresh;
    };

    for (const ts of root.children) {
        if (ts.error) continue;
        for (const team of ts.children) {
            if (team.error) continue;
            for (const l of team.leaders) get(l.personId, l.fullName).leaderTeams.add(team.name);
            for (const p of team.participants)
                get(p.personId, p.fullName).participantTeams.add(team.name);
        }
    }

    return Array.from(map.entries())
        .filter(([, a]) => a.leaderTeams.size > 0 && a.participantTeams.size > 0)
        .map(([personId, a]) => ({
            personId,
            fullName: a.fullName,
            leaderTeams: Array.from(a.leaderTeams).sort((x, y) => x.localeCompare(y, 'de')),
            participantTeams: Array.from(a.participantTeams).sort((x, y) =>
                x.localeCompare(y, 'de'),
            ),
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'de'));
}

export type WithoutTeamEntry = {
    personId: number;
    fullName: string;
    teilstammNames: string[];
};

/**
 * People who belong to a Teilstamm group but to none of its teams, split by
 * whether they hold a leadership role there.
 *
 * The two cases mean opposite things. A Stammwart without a team is normal —
 * that is what the Leitungs-Untergruppen exist for. A plain Mitarbeiter
 * without a team is usually a leftover: the automatic membership feeds the
 * Teilstamm from the teams, so someone who is in no team got there by hand or
 * stayed behind when their team was dissolved.
 *
 * A Teilstamm with an errored team is skipped entirely — with incomplete team
 * membership we would accuse people of having no team when we simply could
 * not read one.
 */
export function findPeopleWithoutTeam(root: OrgNode): {
    staff: WithoutTeamEntry[];
    leadership: WithoutTeamEntry[];
} {
    type Acc = { fullName: string; teilstaemme: Set<string> };
    const staff = new Map<number, Acc>();
    const leadership = new Map<number, Acc>();

    const add = (map: Map<number, Acc>, personId: number, fullName: string, tsName: string) => {
        const existing = map.get(personId);
        if (existing) existing.teilstaemme.add(tsName);
        else map.set(personId, { fullName, teilstaemme: new Set([tsName]) });
    };

    for (const ts of root.children) {
        if (ts.error || ts.children.some((team) => team.error)) continue;

        const inTeams = new Set<number>();
        for (const team of ts.children) {
            for (const l of team.leaders) inTeams.add(l.personId);
            for (const p of team.participants) inTeams.add(p.personId);
        }

        for (const l of ts.leaders) {
            if (inTeams.has(l.personId)) continue;
            add(l.isPillRole ? leadership : staff, l.personId, l.fullName, ts.name);
        }
        for (const p of ts.participants) {
            if (inTeams.has(p.personId)) continue;
            add(staff, p.personId, p.fullName, ts.name);
        }
    }

    const shape = (map: Map<number, Acc>): WithoutTeamEntry[] =>
        Array.from(map.entries())
            .map(([personId, acc]) => ({
                personId,
                fullName: acc.fullName,
                teilstammNames: Array.from(acc.teilstaemme).sort((a, b) =>
                    a.localeCompare(b, 'de'),
                ),
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'de'));

    return { staff: shape(staff), leadership: shape(leadership) };
}
