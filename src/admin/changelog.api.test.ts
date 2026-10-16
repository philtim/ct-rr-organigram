import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: client }));

import {
    fetchMembershipLogLines,
    fetchMembershipPersons,
    parseLogLine,
    scopedGroups,
    syncChangeLog,
    toEntries,
} from './changelog.api';
import type { LogLine, ParsedLine } from './changelog.api';
import { EMPTY_SETTINGS } from '@/shared/settings';

const line = (message: string, extra: Partial<LogLine> = {}): LogLine => ({
    id: 100,
    date: '2026-10-16T05:22:30Z',
    domainType: 'group_membership',
    personName: 'Ulrike Test',
    message,
    ...extra,
});

const ADDED =
    'Gruppenmitgliedschaft[38872] "RR Kundschafterteam Eisbären|Tyler Test" erstellt — Gruppe: 2156, Person: 43450, Rolle: Teilnehmer, Status: active, Gruppeneintrittsdatum: 2026-10-16 00:00:00';
const REMOVED =
    'Gruppenmitgliedschaft[33132] "RR Teilnehmer|Leah Test" gelöscht — Gruppe: 2646, Person: 37483, Rolle: Teilnehmer, Status: active, Gruppeneintrittsdatum: 2022-09-18 00:00:00, Kommentar: \'\'';
const STATUS =
    'Gruppenmitgliedschaft[19821] "RR Pfadfinderteam Schneefüchse|Lotte Test" geändert — Status: active → to_delete';
const ROLE_AND_STATUS =
    'Gruppenmitgliedschaft[19821] "RR Pfadfinderteam Schneefüchse|Lotte Test" geändert — Rolle: Leiter → Teilnehmer, Status: active → to_delete';
const ROLE =
    'Gruppenmitgliedschaft[19821] "RR Pfadfinderteam Schneefüchse|Lotte Test" geändert — Rolle: Teilnehmer → Leiter, roleChangedDate: 2020-09-29 00:00:00 → 2026-09-24 17:27:30';

describe('parseLogLine', () => {
    it('reads an added membership', () => {
        expect(parseLogLine(line(ADDED))).toMatchObject({
            logId: 100,
            at: '2026-10-16T05:22:30Z',
            membershipId: 38872,
            verb: 'erstellt',
            groupId: 2156,
            groupTitle: 'RR Kundschafterteam Eisbären',
            personName: 'Tyler Test',
            personId: 43450,
            role: 'Teilnehmer',
            status: 'active',
            roleChange: null,
            statusChange: null,
            actor: 'Ulrike Test',
        });
    });

    it('reads a removed membership', () => {
        expect(parseLogLine(line(REMOVED))).toMatchObject({
            verb: 'gelöscht',
            membershipId: 33132,
            groupId: 2646,
            groupTitle: 'RR Teilnehmer',
            personName: 'Leah Test',
            personId: 37483,
            role: 'Teilnehmer',
        });
    });

    it('reads a status change, which carries no group id', () => {
        expect(parseLogLine(line(STATUS))).toMatchObject({
            verb: 'geändert',
            groupId: null,
            groupTitle: 'RR Pfadfinderteam Schneefüchse',
            personId: null,
            roleChange: null,
            statusChange: ['active', 'to_delete'],
        });
    });

    it('reads a role and a status change on one line', () => {
        expect(parseLogLine(line(ROLE_AND_STATUS))).toMatchObject({
            roleChange: ['Leiter', 'Teilnehmer'],
            statusChange: ['active', 'to_delete'],
        });
    });

    it('reads only the role out of a role change with timestamps', () => {
        expect(parseLogLine(line(ROLE))).toMatchObject({
            roleChange: ['Teilnehmer', 'Leiter'],
            statusChange: null,
        });
    });

    it('keeps the title before the last pipe', () => {
        expect(
            parseLogLine(
                line(
                    'Gruppenmitgliedschaft[1] "Team A|B|Max Test" erstellt — Gruppe: 5, Person: 6, Rolle: Teilnehmer, Status: active',
                ),
            ),
        ).toMatchObject({ groupTitle: 'Team A|B', personName: 'Max Test' });
    });

    it.each([
        [
            'a comment-only change',
            line('Gruppenmitgliedschaft[2] "X|Y" geändert — Kommentar:  → \'war nicht da\''),
        ],
        [
            'an unchanged line',
            line('Gruppenmitgliedschaft[33132] "RR Teilnehmer|Leah Test" unverändert'),
        ],
        [
            'another domain',
            line('Berechtigung entzogen … Gruppenmitgliedschaft …', { domainType: 'system' }),
        ],
    ])('ignores %s', (_, l) => {
        expect(parseLogLine(l)).toBe('ignored');
    });

    it.each([
        [
            'an added line without a group',
            line('Gruppenmitgliedschaft[1] "A|B" erstellt — Person: 5'),
        ],
        ['an unknown form', line('Gruppenmitgliedschaft wurde neu berechnet')],
    ])('cannot parse %s', (_, l) => {
        expect(parseLogLine(l)).toBe('unparsed');
    });
});

const parsed = (over: Partial<ParsedLine>): ParsedLine => ({
    logId: 1,
    at: '2026-10-10T00:00:00Z',
    membershipId: 10,
    verb: 'erstellt',
    groupId: 2156,
    groupTitle: 'Eisbären',
    personName: 'Tyler Test',
    personId: 43450,
    role: 'Teilnehmer',
    status: 'active',
    roleChange: null,
    statusChange: null,
    actor: 'Ulrike Test',
    ...over,
});

const GROUPS = [
    { id: 2156, name: 'Eisbären' },
    { id: 1569, name: 'Schneefüchse' },
];

describe('toEntries', () => {
    it('maps an added line by group id and drops out-of-scope lines', () => {
        const entries = toEntries(
            [parsed({}), parsed({ logId: 2, groupId: 999, groupTitle: 'Hajk' })],
            GROUPS,
            new Map(),
        );
        expect(entries).toEqual([
            {
                logId: 1,
                at: '2026-10-10T00:00:00Z',
                kind: 'added',
                personName: 'Tyler Test',
                personId: 43450,
                groupId: 2156,
                groupName: 'Eisbären',
                role: 'Teilnehmer',
                actor: 'Ulrike Test',
            },
        ]);
    });

    it('carries a non-active status on an added line', () => {
        expect(toEntries([parsed({ status: 'requested' })], GROUPS, new Map())[0]).toMatchObject({
            kind: 'added',
            to: 'requested',
        });
    });

    it('maps a removed line', () => {
        expect(toEntries([parsed({ verb: 'gelöscht' })], GROUPS, new Map())[0]).toMatchObject({
            kind: 'removed',
            role: 'Teilnehmer',
        });
    });

    it('maps a changed line by title, resolving the person through the membership', () => {
        const entries = toEntries(
            [
                parsed({
                    verb: 'geändert',
                    groupId: null,
                    groupTitle: 'Schneefüchse',
                    personId: null,
                    role: null,
                    status: null,
                    membershipId: 19821,
                    roleChange: ['Leiter', 'Teilnehmer'],
                    statusChange: ['active', 'to_delete'],
                }),
            ],
            GROUPS,
            new Map([[19821, 36532]]),
        );
        expect(entries).toEqual([
            expect.objectContaining({
                logId: 1,
                kind: 'role',
                groupId: 1569,
                groupName: 'Schneefüchse',
                personId: 36532,
                from: 'Leiter',
                role: 'Teilnehmer',
            }),
            expect.objectContaining({
                logId: 1,
                kind: 'status',
                personId: 36532,
                from: 'active',
                to: 'to_delete',
            }),
        ]);
    });

    it('leaves the person null when the membership no longer resolves', () => {
        const entries = toEntries(
            [
                parsed({
                    verb: 'geändert',
                    groupId: null,
                    groupTitle: 'Schneefüchse',
                    personId: null,
                    roleChange: ['A', 'B'],
                }),
            ],
            GROUPS,
            new Map(),
        );
        expect(entries[0].personId).toBeNull();
    });

    it('orders newest first', () => {
        const entries = toEntries(
            [
                parsed({ logId: 1, at: '2026-10-01T00:00:00Z' }),
                parsed({ logId: 2, at: '2026-10-05T00:00:00Z' }),
            ],
            GROUPS,
            new Map(),
        );
        expect(entries.map((e) => e.logId)).toEqual([2, 1]);
    });
});

const page = (data: unknown[]) => ({ data: { data, meta: { pagination: { lastPage: 1 } } } });

describe('API reads', () => {
    beforeEach(() => {
        client.get.mockReset();
    });

    it('asks the log for membership lines after the window start', async () => {
        client.get.mockResolvedValueOnce(page([line(ADDED)]));
        const lines = await fetchMembershipLogLines(new Date('2026-09-16T06:00:00Z'));
        expect(lines).toHaveLength(1);
        const url: string = client.get.mock.calls[0][0];
        expect(url).toContain('/logs?');
        expect(url).toContain('after=2026-09-16T06%3A00%3A00.000Z');
        expect(url).toContain('message=Gruppenmitgliedschaft');
        expect(url).toContain('limit=100');
    });

    it('maps membership ids to person ids, skipping rows without either', async () => {
        client.get.mockResolvedValueOnce(
            page([
                { id: 11, person: { domainIdentifier: '99' } },
                { person: { domainIdentifier: '5' } },
                { id: 12 },
            ]),
        );
        const map = await fetchMembershipPersons([7]);
        expect(client.get.mock.calls[0][0]).toMatch(/^\/groups\/7\/members\?limit=200/);
        expect([...map]).toEqual([[11, 99]]);
    });

    it('collects the groups the dashboard counts, with titles', async () => {
        client.get.mockImplementation(async (url: string) => {
            if (url.startsWith('/groups/950?')) return { id: 950, name: 'Hauptstamm' };
            if (url.startsWith('/groups/80?')) return { id: 80, name: 'Teilstamm' };
            if (url.startsWith('/groups/2774?')) return { id: 2774, name: 'Sammel' };
            if (url === '/groups/950/children') return [];
            if (url === '/groups/80/children')
                return [
                    {
                        title: 'Team',
                        domainIdentifier: '2156',
                        domainAttributes: { groupTypeId: 1 },
                    },
                    {
                        title: 'Camp',
                        domainIdentifier: '2809',
                        domainAttributes: { groupTypeId: 5 },
                    },
                ];
            throw new Error(`unexpected ${url}`);
        });
        const groups = await scopedGroups({
            ...EMPTY_SETTINGS,
            gateGroupId: 950,
            teilstammIds: [80, 950],
            collectionGroupIds: [2774],
            teamGroupTypeIds: [1],
        });
        expect(groups).toEqual(
            expect.arrayContaining([
                { id: 950, name: 'Hauptstamm' },
                { id: 80, name: 'Teilstamm' },
                { id: 2774, name: 'Sammel' },
                { id: 2156, name: 'Team' },
            ]),
        );
        expect(groups).toHaveLength(4);
    });

    it('builds the whole log from the pieces', async () => {
        client.get.mockImplementation(async (url: string) => {
            if (url.startsWith('/groups/950?'))
                return { id: 950, name: 'RR Pfadfinderteam Schneefüchse' };
            if (url === '/groups/950/children') return [];
            if (url.startsWith('/logs?'))
                return page([
                    line(ADDED, { id: 1 }),
                    line(STATUS, { id: 2 }),
                    line('Gruppenmitgliedschaft kaputt', { id: 3 }),
                    line('egal', { id: 4, domainType: 'system' }),
                ]);
            if (url.startsWith('/groups/950/members?'))
                return page([{ id: 19821, person: { domainIdentifier: '36532' } }]);
            throw new Error(`unexpected ${JSON.stringify(url)}`);
        });
        const now = new Date('2026-10-16T06:00:00Z');
        const log = await syncChangeLog(
            { ...EMPTY_SETTINGS, gateGroupId: 950, teilstammIds: [950] },
            now,
        );
        expect(log).toMatchObject({
            syncedAt: '2026-10-16T06:00:00.000Z',
            since: '2026-09-16T06:00:00.000Z',
            linesRead: 4,
            linesUnparsed: 1,
        });
        expect(log.entries).toEqual([
            expect.objectContaining({ logId: 2, kind: 'status', personId: 36532, groupId: 950 }),
        ]);
    });
});
