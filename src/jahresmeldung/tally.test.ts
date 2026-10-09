import { describe, expect, it } from 'vitest';
import {
    COLUMNS,
    OHNE_TEAM_ROW,
    ageBucket,
    genderOf,
    rowGesamt,
    rowLeiter,
    rowTeilnehmer,
    tally,
} from './tally';
import type { Cells, RowDef, ScopedPerson } from './tally';

const ENTDECKER = 1;
const PFADRANGER = 2;

const ROWS: RowDef[] = [
    { teilstammId: ENTDECKER, label: 'RR Entdeckerstamm-MA', incomplete: false },
    { teilstammId: PFADRANGER, label: 'RR Pfadrangerstamm-MA', incomplete: false },
];

let nextId = 1;

/** A plain participant; every test overrides only what it is about. */
function person(over: Partial<ScopedPerson> = {}): ScopedPerson {
    return {
        personId: nextId++,
        name: 'Test Person',
        frontendUrl: null,
        gender: 'm',
        genderGap: null,
        isLeader: false,
        age: 'adult',
        teamTeilstammIds: [ENTDECKER],
        leaderTeilstammIds: [],
        ...over,
    };
}

function row(result: ReturnType<typeof tally>, key: string | number) {
    const found = result.rows.find((r) => r.key === String(key));
    if (!found) throw new Error(`no row ${key}`);
    return found;
}

/** Total of every cell in the table — the number that must equal the headcount. */
function sumAll(cells: Cells): number {
    return COLUMNS.reduce((acc, c) => acc + cells[c], 0);
}

describe('tally', () => {
    it('renders a row per Teilstamm plus "Mitarbeiter ohne Team", even with no people', () => {
        const result = tally([], ROWS);

        expect(result.rows.map((r) => r.key)).toEqual([
            String(ENTDECKER),
            String(PFADRANGER),
            OHNE_TEAM_ROW,
        ]);
        expect(sumAll(result.total)).toBe(0);
        expect(result.ohneTeam).toEqual([]);
    });

    it('sorts participants into Jungen and Mädchen by gender', () => {
        const result = tally([person({ gender: 'm' }), person({ gender: 'w' })], ROWS);

        expect(row(result, ENTDECKER).cells.jungen).toBe(1);
        expect(row(result, ENTDECKER).cells.maedchen).toBe(1);
    });

    it('sorts adult leaders into the Mitarbeiter columns', () => {
        const result = tally(
            [
                person({ isLeader: true, age: 'adult', gender: 'm' }),
                person({ isLeader: true, age: 'adult', gender: 'w' }),
            ],
            ROWS,
        );

        expect(row(result, ENTDECKER).cells.mitarbeiterM).toBe(1);
        expect(row(result, ENTDECKER).cells.mitarbeiterW).toBe(1);
    });

    it('counts a leader under 18 as Juniorleiter and nowhere else', () => {
        // The rule the Bund's form warns about: a Pfadranger who leads must
        // not also appear among the Jungen of their own Teilstamm.
        const result = tally(
            [
                person({
                    isLeader: true,
                    age: 'minor',
                    gender: 'm',
                    teamTeilstammIds: [PFADRANGER],
                    leaderTeilstammIds: [PFADRANGER],
                }),
            ],
            ROWS,
        );

        const pfadranger = row(result, PFADRANGER);
        expect(pfadranger.cells.juniorleiterM).toBe(1);
        expect(pfadranger.cells.jungen).toBe(0);
        expect(pfadranger.cells.mitarbeiterM).toBe(0);
        expect(sumAll(result.total)).toBe(1);
    });

    it('puts people without any team membership in the "ohne Team" row', () => {
        const result = tally(
            [person({ isLeader: true, teamTeilstammIds: [], leaderTeilstammIds: [] })],
            ROWS,
        );

        expect(row(result, OHNE_TEAM_ROW).cells.mitarbeiterM).toBe(1);
        expect(row(result, ENTDECKER).cells.mitarbeiterM).toBe(0);
    });

    describe('people active in more than one Teilstamm', () => {
        it('counts them once, in the Teilstamm where they lead', () => {
            const result = tally(
                [
                    person({
                        isLeader: true,
                        teamTeilstammIds: [ENTDECKER, PFADRANGER],
                        leaderTeilstammIds: [PFADRANGER],
                    }),
                ],
                ROWS,
            );

            expect(row(result, PFADRANGER).cells.mitarbeiterM).toBe(1);
            expect(row(result, ENTDECKER).cells.mitarbeiterM).toBe(0);
            expect(sumAll(result.total)).toBe(1);
        });

        it('falls back to display order when they lead in none of them', () => {
            const result = tally(
                [person({ teamTeilstammIds: [PFADRANGER, ENTDECKER], leaderTeilstammIds: [] })],
                ROWS,
            );

            expect(row(result, ENTDECKER).cells.jungen).toBe(1);
            expect(row(result, PFADRANGER).cells.jungen).toBe(0);
        });

        it('reports them, naming the row they ended up in', () => {
            const result = tally(
                [
                    person({
                        name: 'Ole Reinhardt',
                        teamTeilstammIds: [ENTDECKER, PFADRANGER],
                        leaderTeilstammIds: [],
                    }),
                ],
                ROWS,
            );

            expect(result.issues).toEqual([
                expect.objectContaining({
                    name: 'Ole Reinhardt',
                    reason: 'multi-teilstamm',
                    rowLabel: 'RR Entdeckerstamm-MA',
                }),
            ]);
        });
    });

    describe('people the form cannot place', () => {
        it('files an unmaintained gender under "ohne Zuordnung" and reports it', () => {
            const result = tally(
                [person({ name: 'Lena H.', gender: 'unassignable', genderGap: 'not-maintained' })],
                ROWS,
            );

            expect(row(result, ENTDECKER).cells.ohneZuordnung).toBe(1);
            expect(result.issues).toEqual([
                expect.objectContaining({ name: 'Lena H.', reason: 'gender-missing' }),
            ]);
            expect(result.hasUnassigned).toBe(true);
        });

        it('keeps a diverse gender apart from a missing one', () => {
            // Same column — the form has no third option — but a different
            // reason: there is nothing here to correct in ChurchTools.
            const result = tally([person({ gender: 'unassignable', genderGap: 'diverse' })], ROWS);

            expect(row(result, ENTDECKER).cells.ohneZuordnung).toBe(1);
            expect(result.issues[0].reason).toBe('gender-diverse');
        });

        it('cannot tell Mitarbeiter from Juniorleiter without a birthday', () => {
            const result = tally([person({ isLeader: true, age: 'unknown' })], ROWS);

            expect(row(result, ENTDECKER).cells.ohneZuordnung).toBe(1);
            expect(row(result, ENTDECKER).cells.mitarbeiterM).toBe(0);
            expect(result.issues[0].reason).toBe('age-unknown');
        });

        it('reports both gaps for one person but counts them once', () => {
            const result = tally(
                [
                    person({
                        isLeader: true,
                        age: 'unknown',
                        gender: 'unassignable',
                        genderGap: 'not-maintained',
                    }),
                ],
                ROWS,
            );

            expect(result.issues.map((i) => i.reason).sort()).toEqual([
                'age-unknown',
                'gender-missing',
            ]);
            expect(sumAll(result.total)).toBe(1);
        });

        it('leaves the column out when nobody lands in it', () => {
            expect(tally([person()], ROWS).hasUnassigned).toBe(false);
        });
    });

    it('totals every column across the rows', () => {
        const result = tally(
            [
                person({ gender: 'm', teamTeilstammIds: [ENTDECKER] }),
                person({ gender: 'm', teamTeilstammIds: [PFADRANGER] }),
                person({ gender: 'w', teamTeilstammIds: [PFADRANGER] }),
            ],
            ROWS,
        );

        expect(result.total.jungen).toBe(2);
        expect(result.total.maedchen).toBe(1);
    });

    describe('the roll-ups at the end of each row', () => {
        it('splits the row into Teilnehmer, Leiter and the headcount', () => {
            const result = tally(
                [
                    person({ gender: 'm' }),
                    person({ gender: 'w' }),
                    person({ isLeader: true, age: 'minor', gender: 'm' }),
                    person({ isLeader: true, age: 'adult', gender: 'w' }),
                ],
                ROWS,
            );
            const cells = row(result, ENTDECKER).cells;

            expect(rowTeilnehmer(cells)).toBe(2);
            // Juniorleiter count as leaders — they lead, they are just under 18.
            expect(rowLeiter(cells)).toBe(2);
            expect(rowGesamt(cells)).toBe(4);
        });

        it('counts someone the form cannot place in the headcount only', () => {
            const result = tally(
                [person({ gender: 'unassignable', genderGap: 'not-maintained' })],
                ROWS,
            );
            const cells = row(result, ENTDECKER).cells;

            expect(rowTeilnehmer(cells)).toBe(0);
            expect(rowLeiter(cells)).toBe(0);
            expect(rowGesamt(cells)).toBe(1);
        });

        it('adds up to the headcount, always', () => {
            const people = [
                person(),
                person({ isLeader: true, age: 'minor', gender: 'w' }),
                person({ isLeader: true, age: 'adult' }),
                person({ gender: 'unassignable', genderGap: 'diverse' }),
            ];
            const total = tally(people, ROWS).total;

            expect(rowTeilnehmer(total) + rowLeiter(total)).toBe(people.length - 1);
            expect(rowGesamt(total)).toBe(people.length);
        });
    });

    describe('the "Mitarbeiter ohne Team" row', () => {
        it('names the people it is made of, sorted', () => {
            const result = tally(
                [
                    person({ name: 'Zoe Zweit', teamTeilstammIds: [], leaderTeilstammIds: [] }),
                    person({
                        name: 'Anna Erst',
                        frontendUrl: 'https://ct.example/persons/7',
                        teamTeilstammIds: [],
                        leaderTeilstammIds: [],
                    }),
                ],
                ROWS,
            );

            expect(result.ohneTeam.map((p) => p.name)).toEqual(['Anna Erst', 'Zoe Zweit']);
            expect(result.ohneTeam[0].frontendUrl).toBe('https://ct.example/persons/7');
        });

        it('leaves out everyone who does have a team', () => {
            expect(tally([person()], ROWS).ohneTeam).toEqual([]);
        });
    });

    it('places every person in exactly one cell, whatever their shape', () => {
        // The invariant the whole table rests on: "Gesamt" is a column sum,
        // not a separately computed number, so it cannot drift from reality.
        const people = [
            person(),
            person({ gender: 'w' }),
            person({ isLeader: true, age: 'minor', gender: 'w' }),
            person({ isLeader: true, age: 'unknown' }),
            person({ gender: 'unassignable', genderGap: 'diverse' }),
            person({ teamTeilstammIds: [], leaderTeilstammIds: [] }),
            person({ teamTeilstammIds: [ENTDECKER, PFADRANGER] }),
        ];

        const result = tally(people, ROWS);

        expect(sumAll(result.total)).toBe(people.length);
        expect(rowGesamt(result.total)).toBe(people.length);
    });

    describe('when a team could not be loaded', () => {
        it('marks the affected row and the table as incomplete', () => {
            const rows: RowDef[] = [
                { teilstammId: ENTDECKER, label: 'RR Entdeckerstamm-MA', incomplete: true },
                { teilstammId: PFADRANGER, label: 'RR Pfadrangerstamm-MA', incomplete: false },
            ];

            const result = tally([person()], rows);

            expect(row(result, ENTDECKER).incomplete).toBe(true);
            expect(row(result, PFADRANGER).incomplete).toBe(false);
            expect(result.incomplete).toBe(true);
        });

        it('stays complete when every team loaded', () => {
            expect(tally([person()], ROWS).incomplete).toBe(false);
        });

        it('can mark the "ohne Team" row alone, which no Teilstamm feeds', () => {
            const result = tally([person()], ROWS, true);

            expect(row(result, OHNE_TEAM_ROW).incomplete).toBe(true);
            expect(row(result, ENTDECKER).incomplete).toBe(false);
            expect(result.incomplete).toBe(true);
        });
    });
});

describe('genderOf', () => {
    it('maps the two the form has columns for', () => {
        expect(genderOf(1)).toEqual({ gender: 'm', genderGap: null });
        expect(genderOf(2)).toEqual({ gender: 'w', genderGap: null });
    });

    it('treats an explicit "unbekannt" and a never-set field alike', () => {
        for (const value of [0, null, undefined]) {
            expect(genderOf(value)).toEqual({
                gender: 'unassignable',
                genderGap: 'not-maintained',
            });
        }
    });

    it('keeps divers apart — a complete record the form cannot express', () => {
        expect(genderOf(3)).toEqual({ gender: 'unassignable', genderGap: 'diverse' });
    });
});

describe('ageBucket', () => {
    const today = new Date(2026, 9, 9); // 2026-10-09

    it('counts somebody 18 or older as an adult', () => {
        expect(ageBucket('2008-10-09', today)).toBe('adult');
        expect(ageBucket('1970-01-01', today)).toBe('adult');
    });

    it('counts somebody under 18 as a minor', () => {
        expect(ageBucket('2009-01-01', today)).toBe('minor');
    });

    it('does not promote somebody whose birthday is later this year', () => {
        // Turns 18 on 2026-10-10 — still a Juniorleiter today.
        expect(ageBucket('2008-10-10', today)).toBe('minor');
    });

    it('promotes somebody exactly on their 18th birthday', () => {
        expect(ageBucket('2008-10-09', today)).toBe('adult');
    });

    it('accepts the full ISO timestamp ChurchTools may send', () => {
        expect(ageBucket('2009-01-01T00:00:00Z', today)).toBe('minor');
    });

    it('says unknown rather than guessing adult', () => {
        for (const value of [null, undefined, '', 'nope']) {
            expect(ageBucket(value, today)).toBe('unknown');
        }
    });
});
