/**
 * The counting rules of the Jahresmeldung, as pure functions (ADR-009).
 *
 * Everything here operates on `ScopedPerson` — a person reduced to the facts
 * the table needs. There is deliberately no `birthday` and no `sexId` on that
 * type: the loader turns both into the small enums below and throws the
 * originals away, so no component downstream can render a date of birth even
 * by accident (ADR-013).
 *
 * The rules themselves come from the Bund's "Mitgliederzahlen" form, which is
 * why the columns are named after its columns rather than after anything in
 * ChurchTools. See `docs/design/001-jahresmeldung.md` for the full derivation.
 */

export { ageBucket, todayUtc } from '@/shared/rr/dates';

export const COLUMNS = [
    'jungen',
    'maedchen',
    'juniorleiterM',
    'juniorleiterW',
    'mitarbeiterM',
    'mitarbeiterW',
    'ohneZuordnung',
] as const;

export type Column = (typeof COLUMNS)[number];
export type Cells = Record<Column, number>;

/** What the form can express, plus the bucket for everyone it cannot. */
export type Gender = 'm' | 'w' | 'unassignable';

/**
 * Why a gender is unassignable. `not-maintained` is a gap in ChurchTools and
 * can be closed; `diverse` is a complete record that a two-gender form has no
 * column for. They share a cell and must not share a label.
 */
export type GenderGap = 'not-maintained' | 'diverse';

/** Leaders only: under 18 means Juniorleiter, 18 and over means Mitarbeiter. */
export type Age = 'adult' | 'minor' | 'unknown';

/** One person in scope, carrying nothing that could be rendered as detail. */
export type ScopedPerson = {
    personId: number;
    name: string;
    /** ChurchTools' own person link, passed through verbatim (ADR-013). */
    frontendUrl: string | null;
    gender: Gender;
    /** Set exactly when `gender` is `unassignable`. */
    genderGap: GenderGap | null;
    /** True when any role the person holds anywhere in scope counts as leading. */
    isLeader: boolean;
    /** Only consulted for leaders; a participant's age changes no column. */
    age: Age;
    /** Teilstamm ids this person holds a team membership under. */
    teamTeilstammIds: number[];
    /** The subset of those where the membership is a leading role. */
    leaderTeilstammIds: number[];
};

/** One Teilstamm, as the table will render it. */
export type RowDef = {
    teilstammId: number;
    /** The ChurchTools group name, verbatim — never a hardcoded "Entdecker". */
    label: string;
    /** True when a team under this Teilstamm failed to load. */
    incomplete: boolean;
};

/** The form's last body row, which has no Teilstamm behind it. */
export const OHNE_TEAM_ROW = 'ohne-team';

export type TallyRow = {
    key: string;
    label: string;
    cells: Cells;
    incomplete: boolean;
};

export type IssueReason = 'gender-missing' | 'gender-diverse' | 'age-unknown' | 'multi-teilstamm';

/** A person the table had to make a decision about, named so it can be fixed. */
export type Issue = {
    personId: number;
    name: string;
    frontendUrl: string | null;
    reason: IssueReason;
    /** The row this person was ultimately counted in. */
    rowLabel: string;
};

/** The least that identifies a person and lets the reader open them in ChurchTools. */
export type PersonRef = {
    personId: number;
    name: string;
    frontendUrl: string | null;
};

export type Tally = {
    rows: TallyRow[];
    total: Cells;
    /**
     * Who the "Mitarbeiter ohne Team" row is made of.
     *
     * The only row whose members a reader cannot find by opening a team, and
     * the one most likely to be wrong — somebody who left a team and was never
     * removed from the Teilstamm lands here silently. Naming them is the same
     * exposure the organigram's own "Mitarbeiter ohne Team" list already
     * carries, and nothing beyond a name and ChurchTools' own link (ADR-013).
     */
    ohneTeam: PersonRef[];
    issues: Issue[];
    /** True when any team failed to load — every total becomes untrustworthy. */
    incomplete: boolean;
    /** True when anyone landed outside the form's six columns. */
    hasUnassigned: boolean;
};

/** ChurchTools' `sexId`, as `GET /person/masterdata` defines it. */
const SEX_MALE = 1;
const SEX_FEMALE = 2;
const SEX_DIVERSE = 3;

/**
 * Turn `sexId` into something the form can use.
 *
 * `0` is ChurchTools' explicit "unbekannt" and `null`/`undefined` means the
 * field was never set; both are the same gap to a reader and are reported as
 * one. `3` is not a gap at all — the record is complete, the form simply has
 * no column for it, which is why it carries its own reason.
 */
export function genderOf(sexId: number | null | undefined): {
    gender: Gender;
    genderGap: GenderGap | null;
} {
    if (sexId === SEX_MALE) return { gender: 'm', genderGap: null };
    if (sexId === SEX_FEMALE) return { gender: 'w', genderGap: null };
    return {
        gender: 'unassignable',
        genderGap: sexId === SEX_DIVERSE ? 'diverse' : 'not-maintained',
    };
}

function emptyCells(): Cells {
    return {
        jungen: 0,
        maedchen: 0,
        juniorleiterM: 0,
        juniorleiterW: 0,
        mitarbeiterM: 0,
        mitarbeiterW: 0,
        ohneZuordnung: 0,
    };
}

/**
 * The person's category, decided once across their whole membership.
 *
 * Leading beats participating, the same precedence `hierarchy.ts` applies to
 * the organigram's tiles. That is what keeps a Pfadranger who leads a team out
 * of the Jungen column — the case the Bund's form warns about explicitly.
 */
function categoryOf(person: ScopedPerson): 'teilnehmer' | 'juniorleiter' | 'mitarbeiter' | null {
    if (!person.isLeader) return 'teilnehmer';
    if (person.age === 'minor') return 'juniorleiter';
    if (person.age === 'adult') return 'mitarbeiter';
    return null; // leader, age unknown — not placeable
}

function columnOf(person: ScopedPerson): Column {
    const category = categoryOf(person);
    if (category === null || person.gender === 'unassignable') return 'ohneZuordnung';

    const male = person.gender === 'm';
    if (category === 'teilnehmer') return male ? 'jungen' : 'maedchen';
    if (category === 'juniorleiter') return male ? 'juniorleiterM' : 'juniorleiterW';
    return male ? 'mitarbeiterM' : 'mitarbeiterW';
}

/**
 * Which row a person belongs to.
 *
 * Someone in teams under two Teilstämme must be counted once or the Gesamt row
 * stops being a headcount. Leading wins, because that is the Teilstamm the
 * person is accountable to; beyond that, display order decides, so the answer
 * is at least stable across reloads. Either way the caller is told, because a
 * deterministic choice is still a choice somebody may want to check — and on
 * the live instance this fires for roughly one person in twenty.
 */
function rowKeyOf(person: ScopedPerson, order: number[]): { key: string; ambiguous: boolean } {
    const teams = order.filter((id) => person.teamTeilstammIds.includes(id));
    if (teams.length === 0) return { key: OHNE_TEAM_ROW, ambiguous: false };
    if (teams.length === 1) return { key: String(teams[0]), ambiguous: false };

    const led = teams.find((id) => person.leaderTeilstammIds.includes(id));
    return { key: String(led ?? teams[0]), ambiguous: true };
}

function sumCells(cells: Cells): number {
    let total = 0;
    for (const column of COLUMNS) total += cells[column];
    return total;
}

/**
 * The three roll-ups at the end of each row. Derived on read rather than
 * stored, so they cannot drift from the cells they summarise.
 *
 * These are not part of the Bund's form — it asks for the six columns only.
 * They are here because the Stamm reads this table for its own purposes too,
 * and the view sets them apart from the form columns so nobody transcribes
 * one by mistake.
 */
export function rowTeilnehmer(cells: Cells): number {
    return cells.jungen + cells.maedchen;
}

/** Everyone in a leading function — Juniorleiter count as leaders. */
export function rowLeiter(cells: Cells): number {
    return cells.juniorleiterM + cells.juniorleiterW + cells.mitarbeiterM + cells.mitarbeiterW;
}

/** Headcount of the row, including anyone the form cannot place. */
export function rowGesamt(cells: Cells): number {
    return sumCells(cells);
}

/**
 * Build the whole table from the people in scope.
 *
 * Every person lands in exactly one row and exactly one column, which is what
 * makes the Gesamt row an honest column sum rather than a second calculation
 * that can drift. `tally.test.ts` asserts that invariant directly.
 */
export function tally(people: ScopedPerson[], rows: RowDef[], ohneTeamIncomplete = false): Tally {
    const order = rows.map((r) => r.teilstammId);
    const byKey = new Map<string, TallyRow>();

    for (const def of rows) {
        byKey.set(String(def.teilstammId), {
            key: String(def.teilstammId),
            label: def.label,
            cells: emptyCells(),
            incomplete: def.incomplete,
        });
    }
    byKey.set(OHNE_TEAM_ROW, {
        key: OHNE_TEAM_ROW,
        label: 'Mitarbeiter ohne Team',
        cells: emptyCells(),
        // Fed by the Hauptstamm and the Teilstamm-MA groups rather than by
        // teams, so it fails independently of any row above it.
        incomplete: ohneTeamIncomplete,
    });

    const issues: Issue[] = [];
    const ohneTeam: PersonRef[] = [];

    for (const person of people) {
        const { key, ambiguous } = rowKeyOf(person, order);
        const row = byKey.get(key);
        if (!row) continue;

        row.cells[columnOf(person)] += 1;
        if (key === OHNE_TEAM_ROW) {
            ohneTeam.push({
                personId: person.personId,
                name: person.name,
                frontendUrl: person.frontendUrl,
            });
        }

        const report = (reason: IssueReason) =>
            issues.push({
                personId: person.personId,
                name: person.name,
                frontendUrl: person.frontendUrl,
                reason,
                rowLabel: row.label,
            });

        // A leader with no birthday and no gender is two separate gaps in one
        // record; both get reported, and the person is still counted once.
        if (categoryOf(person) === null) report('age-unknown');
        if (person.gender === 'unassignable') {
            report(person.genderGap === 'diverse' ? 'gender-diverse' : 'gender-missing');
        }
        if (ambiguous) report('multi-teilstamm');
    }

    const tallyRows = [...byKey.values()];
    const total = emptyCells();
    for (const row of tallyRows) {
        for (const column of COLUMNS) total[column] += row.cells[column];
    }

    ohneTeam.sort((a, b) => a.name.localeCompare(b.name, 'de'));

    return {
        rows: tallyRows,
        total,
        ohneTeam,
        issues,
        incomplete: ohneTeamIncomplete || rows.some((r) => r.incomplete),
        hasUnassigned: total.ohneZuordnung > 0,
    };
}
