/**
 * The admin's fetch of the Änderungsprotokoll: the ChurchTools log, read for
 * 30 days of membership lines, parsed and reduced to the groups the dashboard
 * counts (docs/design/003-aenderungsprotokoll.md).
 *
 * The log's lines are German free text. The parser knows the four forms the
 * live instance writes and says so when it meets a fifth — the admin sees
 * that count, so a wording change in ChurchTools shows up as a number, not as
 * a list that quietly got shorter.
 */
import { fetchAllPages, mapWithConcurrency } from '@/shared/api';
import { windowStart } from '@/shared/changelog';
import type { ChangeEntry, ChangeLog } from '@/shared/changelog';
import { getChildGroups, getGroup, personIdOf, teamsAmong } from '@/shared/groups.api';
import type { Settings } from '@/shared/settings';

/** The fields of a `/logs` row this module reads. */
export type LogLine = {
    id: number;
    date: string;
    domainType: string;
    /** Who made the change. */
    personName?: string;
    message: string;
};

export type ParsedLine = {
    logId: number;
    at: string;
    membershipId: number;
    verb: 'erstellt' | 'gelöscht' | 'geändert';
    /** From `Gruppe: <id>` — only `erstellt` and `gelöscht` carry it. */
    groupId: number | null;
    groupTitle: string;
    personName: string;
    personId: number | null;
    role: string | null;
    status: string | null;
    roleChange: [string, string] | null;
    statusChange: [string, string] | null;
    actor: string;
};

// `Gruppenmitgliedschaft[38872] "RR Kundschafterteam Eisbären|Tyler Wittek" erstellt — Gruppe: 2156, …`
// The title is everything before the last `|`: a person's name carries none.
const LINE =
    /^Gruppenmitgliedschaft\[(\d+)\] "(.*)\|(.*)" (erstellt|gelöscht|geändert|unverändert)(?: — (.*))?$/;
const ROLE_CHANGE = /Rolle: (.+?) → (.+?)(?:, |$)/;
const STATUS_CHANGE = /Status: ([^,\s]+) → ([^,\s]+)/;

const field = (text: string, name: string): string | null =>
    text.match(new RegExp(`${name}: ([^,]+)`))?.[1]?.trim() ?? null;

/**
 * One log row → what it says, or why it yields nothing: `ignored` for rows
 * that are not membership changes the dashboard cares about, `unparsed` for
 * membership rows in a form this parser does not know.
 */
export function parseLogLine(line: LogLine): ParsedLine | 'ignored' | 'unparsed' {
    if (line.domainType !== 'group_membership') return 'ignored';
    const m = line.message.match(LINE);
    if (!m) return 'unparsed';
    const [, membershipId, groupTitle, personName, verb, rest = ''] = m;
    if (verb === 'unverändert') return 'ignored';
    const base = {
        logId: line.id,
        at: line.date,
        membershipId: Number(membershipId),
        groupTitle,
        personName,
        actor: line.personName ?? '',
    };
    if (verb === 'geändert') {
        const role = rest.match(ROLE_CHANGE);
        const status = rest.match(STATUS_CHANGE);
        if (!role && !status) return 'ignored';
        return {
            ...base,
            verb,
            groupId: null,
            personId: null,
            role: null,
            status: null,
            roleChange: role ? [role[1], role[2]] : null,
            statusChange: status ? [status[1], status[2]] : null,
        };
    }
    const groupId = field(rest, 'Gruppe');
    if (!groupId) return 'unparsed';
    const personId = field(rest, 'Person');
    return {
        ...base,
        verb: verb as 'erstellt' | 'gelöscht',
        groupId: Number(groupId),
        personId: personId ? Number(personId) : null,
        role: field(rest, 'Rolle'),
        status: field(rest, 'Status'),
        roleChange: null,
        statusChange: null,
    };
}

export type ScopedGroup = { id: number; name: string };

/**
 * Parsed lines → entries in the dashboard's groups, newest first. A line is
 * matched by group id where it carries one, by exact title otherwise; the
 * rest is somebody else's group.
 */
export function toEntries(
    lines: ParsedLine[],
    groups: ScopedGroup[],
    personByMembership: Map<number, number>,
): ChangeEntry[] {
    const byId = new Map(groups.map((g) => [g.id, g]));
    const byTitle = new Map(groups.map((g) => [g.name, g]));
    const entries: ChangeEntry[] = [];
    for (const line of lines) {
        const group = line.groupId !== null ? byId.get(line.groupId) : byTitle.get(line.groupTitle);
        if (!group) continue;
        const common = {
            logId: line.logId,
            at: line.at,
            personName: line.personName,
            personId: line.personId ?? personByMembership.get(line.membershipId) ?? null,
            groupId: group.id,
            groupName: group.name,
            actor: line.actor,
        };
        if (line.verb === 'geändert') {
            if (line.roleChange) {
                entries.push({
                    ...common,
                    kind: 'role',
                    from: line.roleChange[0],
                    role: line.roleChange[1],
                });
            }
            if (line.statusChange) {
                entries.push({
                    ...common,
                    kind: 'status',
                    from: line.statusChange[0],
                    to: line.statusChange[1],
                });
            }
            continue;
        }
        const entry: ChangeEntry = {
            ...common,
            kind: line.verb === 'erstellt' ? 'added' : 'removed',
        };
        if (line.role) entry.role = line.role;
        if (line.verb === 'erstellt' && line.status && line.status !== 'active') {
            entry.to = line.status;
        }
        entries.push(entry);
    }
    return entries.sort((a, b) => b.at.localeCompare(a.at) || b.logId - a.logId);
}

/**
 * The log's membership lines since `since`. `message` is a substring filter
 * the endpoint accepts but does not document; without it the window is 40×
 * larger and `fetchAllPages` gives up at its page cap — loudly, which is the
 * behaviour wanted if the filter ever disappears.
 */
export async function fetchMembershipLogLines(since: Date): Promise<LogLine[]> {
    const params = new URLSearchParams({
        after: since.toISOString(),
        message: 'Gruppenmitgliedschaft',
    });
    return await fetchAllPages<LogLine>(`/logs?${params}`, 100);
}

type MemberRow = { id?: number; person?: { domainIdentifier?: string } };

/**
 * Membership id → person id for every member of the given groups, in every
 * status. A `geändert` line names only the membership; this is how it gets
 * its person back. No status filter on purpose: the person whose status
 * just went to `to_delete` is exactly who must still be found.
 */
export async function fetchMembershipPersons(groupIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    const pages = await mapWithConcurrency(groupIds, 4, (id) =>
        fetchAllPages<MemberRow>(`/groups/${id}/members`, 200),
    );
    for (const row of pages.flat()) {
        const personId = personIdOf(row);
        if (typeof row.id === 'number' && personId !== null) map.set(row.id, personId);
    }
    return map;
}

/** The groups the dashboard counts, with the titles the log will use for them. */
export async function scopedGroups(settings: Settings): Promise<ScopedGroup[]> {
    const stammIds = [
        ...new Set([
            ...(settings.gateGroupId === null ? [] : [settings.gateGroupId]),
            ...settings.teilstammIds,
            ...settings.collectionGroupIds,
        ]),
    ];
    const teilstammIds = [...new Set(settings.teilstammIds)];
    const [stamm, children] = await Promise.all([
        mapWithConcurrency(stammIds, 4, (id) => getGroup(id)),
        mapWithConcurrency(teilstammIds, 4, (id) => getChildGroups(id)),
    ]);
    const groups = new Map<number, ScopedGroup>();
    for (const g of stamm) groups.set(g.id, { id: g.id, name: g.name });
    for (const c of children) {
        for (const t of teamsAmong(c, settings.teamGroupTypeIds)) {
            groups.set(t.id, { id: t.id, name: t.title });
        }
    }
    return [...groups.values()];
}

/** The whole fetch, without the write. Any failure throws; nothing is partial. */
export async function syncChangeLog(settings: Settings, now: Date): Promise<ChangeLog> {
    const since = windowStart(now);
    const [groups, lines] = await Promise.all([
        scopedGroups(settings),
        fetchMembershipLogLines(since),
    ]);
    const parsed: ParsedLine[] = [];
    let linesUnparsed = 0;
    for (const line of lines) {
        const result = parseLogLine(line);
        if (result === 'unparsed') linesUnparsed++;
        else if (result !== 'ignored') parsed.push(result);
    }
    // Only groups a `geändert` line names need their members read.
    const titles = new Set(
        parsed.filter((p) => p.verb === 'geändert' && p.personId === null).map((p) => p.groupTitle),
    );
    const toResolve = groups.filter((g) => titles.has(g.name)).map((g) => g.id);
    const personByMembership = await fetchMembershipPersons(toResolve);
    return {
        syncedAt: now.toISOString(),
        since: since.toISOString(),
        linesRead: lines.length,
        linesUnparsed,
        entries: toEntries(parsed, groups, personByMembership),
    };
}
