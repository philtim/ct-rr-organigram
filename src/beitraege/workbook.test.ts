import { describe, expect, it } from 'vitest';
import { buildSheets, exportFileName } from './workbook';
import type { ExportMeta, ExportSheet } from './workbook';
import type { ExportRow } from '@/shared/rr/export-rows';

type AnyCell =
    | {
          value?: unknown;
          type?: unknown;
          format?: string;
          backgroundColor?: string;
          fontWeight?: string;
      }
    | null
    | undefined;

const ROW: ExportRow = {
    lastName: 'Beispiel',
    firstName: 'Kind',
    birthday: '2014-03-07',
    ageAtDueDate: 12,
    zip: '70000',
    city: 'Musterstadt',
    street: 'Musterweg 1',
    stamm: 'RR Musterstamm-MA',
    teams: 'Team A',
    familyKey: 'F001',
    isStaff: false,
    isJuniorLeader: false,
    reviewNote: '',
    payingPosition: 1,
    amountCents: 8000,
};

const META: ExportMeta = {
    source: 'https://example.church.tools',
    loadedAt: new Date('2026-10-09T08:30:00Z'),
    dueDate: new Date(Date.UTC(2026, 11, 1)),
    stammNames: ['RR Musterstamm-MA'],
    teamCount: 4,
    config: { childCents: [8000, 6000, 0], staffCents: 0, juniorLeaderCents: 0 },
    totals: {
        participants: 3,
        liable: 2,
        exempt: 1,
        exemptStaff: 1,
        exemptJuniorLeader: 0,
        exemptLadder: 0,
        perRung: [1, 1, 0],
        familiesWithThreeOrMore: 0,
        totalCents: 14000,
    },
    quality: {
        missingAddress: 1,
        missingBirthday: 0,
        withoutRelationship: 2,
        unmatchable: 1,
    },
    families: 2,
    version: '1.8.0',
    commit: 'abc1234',
};

function rows(count: number): ExportRow[] {
    return Array.from({ length: count }, (_, i) => ({
        ...ROW,
        familyKey: `F${String(i + 1).padStart(3, '0')}`,
        isStaff: i === 0,
    }));
}

function cellsOf(sheet: ExportSheet, rowIndex: number): AnyCell[] {
    return sheet.data[rowIndex] as AnyCell[];
}

/** Find a row by the text in its first cell — the labels are the stable handle. */
function rowIndexOf(sheet: ExportSheet, label: string): number {
    const index = sheet.data.findIndex((row) => {
        const first = (row as AnyCell[])[0];
        return first != null && typeof first === 'object' && first.value === label;
    });
    expect(index, `row "${label}" exists`).toBeGreaterThanOrEqual(0);
    return index;
}

describe('buildSheets', () => {
    it('produces the three sheets the office expects, in order', () => {
        const [participants, summary, method] = buildSheets(rows(3), META);

        expect(participants.sheet).toBe('Teilnehmer');
        expect(summary.sheet).toBe('Zusammenfassung');
        expect(method.sheet).toBe('Methodik & Quellen');
    });

    it('gives every row as many cells as there are columns', () => {
        const [participants] = buildSheets(rows(5), META);
        const columnCount = participants.columns?.length;

        expect(columnCount).toBe(cellsOf(participants, 0).length);
        for (let i = 1; i < participants.data.length; i++) {
            expect(cellsOf(participants, i)).toHaveLength(columnCount!);
        }
        expect(participants.data).toHaveLength(6);
        expect(participants.stickyRowsCount).toBe(1);
    });
});

/**
 * A formula range one row short drops a family member from a count, and the
 * file still looks perfectly fine — there is no error, just a wrong number.
 * Both sheets' ranges are therefore pinned to the row count.
 */
describe('buildSheets — formula ranges cover every data row', () => {
    it('ends the participant sheet ranges at the last data row', () => {
        const [participants] = buildSheets(rows(7), META);
        const cells = cellsOf(participants, 1);

        expect(cells[10]?.value).toBe('COUNTIF($J$2:$J$8,$J2)');
        expect(cells[12]?.value).toBe('IF($L2<>"nein","",COUNTIFS($J$2:$J2,$J2,$L$2:$L2,"nein"))');
        // The rung is looked up by the position the sheet derives, with MIN
        // making the last rung apply to every further child — the same rule
        // the extension applies, written once more in Excel.
        expect(cells[14]?.value).toBe(
            'IF($L2="MA",Zusammenfassung!$B$7,IF($L2="JL",Zusammenfassung!$B$8,' +
                'INDEX(Zusammenfassung!$B$4:$B$6,MIN($M2,3))))',
        );

        const last = cellsOf(participants, 7);
        expect(last[10]?.value).toBe('COUNTIF($J$2:$J$8,$J8)');
    });

    it('ends the summary sheet ranges at the last data row', () => {
        const [, summary] = buildSheets(rows(7), META);
        const participantCount = cellsOf(
            summary,
            rowIndexOf(summary, 'Aktive RR Teilnehmer (gelistet)'),
        );

        expect(participantCount[1]?.value).toBe('COUNTA(Teilnehmer!$A$2:$A$8)');
    });
});

/**
 * The summary's control block subtracts two independently derived totals. Its
 * formulas address rows by number, so a row inserted above them would make
 * them compare the wrong cells — silently, and in the one place a reader looks
 * to confirm the file is sound.
 */
describe('buildSheets — the control block points at the right rows', () => {
    it('compares the grand total against the sum of the ladder lines', () => {
        const [, summary] = buildSheets(rows(4), META);
        const total = rowIndexOf(summary, 'Gesamtbetrag (€)') + 1;
        const tiers = rowIndexOf(summary, 'Summe der Staffel-Zeilen') + 1;
        const deviation = cellsOf(summary, rowIndexOf(summary, 'Abweichung zum Gesamtbetrag'));

        expect(deviation[2]?.value).toBe(`C${total}-C${tiers}`);
    });

    it('compares the grand total against the figure the view showed', () => {
        const [, summary] = buildSheets(rows(4), META);
        const total = rowIndexOf(summary, 'Gesamtbetrag (€)') + 1;
        const viewIndex = rowIndexOf(summary, 'Kennzahl der Web-Ansicht');
        const deviation = cellsOf(summary, rowIndexOf(summary, 'Abweichung zur Web-Ansicht'));

        expect(cellsOf(summary, viewIndex)[2]?.value).toBe(140);
        expect(deviation[2]?.value).toBe(`C${total}-C${viewIndex + 1}`);
    });

    it('sums the two rate lines from the cells that hold the rates', () => {
        const [, summary] = buildSheets(rows(4), META);
        const first = rowIndexOf(summary, 'Kinder zum Satz 1. Kind');
        const second = rowIndexOf(summary, 'Kinder zum Satz 2. Kind');

        expect(cellsOf(summary, first)[2]?.value).toBe(`B${first + 1}*$B$4`);
        expect(cellsOf(summary, second)[2]?.value).toBe(`B${second + 1}*$B$5`);
        // The rates themselves must sit in exactly those two cells.
        expect(cellsOf(summary, 3)[1]?.value).toBe(80);
        expect(cellsOf(summary, 4)[1]?.value).toBe(60);
    });
});

/**
 * Yellow means "you may change this". It is the only instruction the file
 * gives about editing, so it must not appear anywhere a formula would be
 * overwritten.
 */
describe('buildSheets — yellow marks only what may be edited', () => {
    it('fills the Familien-ID column and the rate cells, nothing else', () => {
        const sheets = buildSheets(rows(4), META);
        const yellow: string[] = [];

        sheets.forEach((sheet) => {
            sheet.data.forEach((row, rowIndex) => {
                (row as AnyCell[]).forEach((cell, columnIndex) => {
                    if (cell && typeof cell === 'object' && cell.backgroundColor === '#FFF2CC') {
                        yellow.push(`${sheet.sheet}!${columnIndex}:${rowIndex}`);
                    }
                });
            });
        });

        expect(yellow).toEqual([
            'Teilnehmer!9:1',
            'Teilnehmer!9:2',
            'Teilnehmer!9:3',
            'Teilnehmer!9:4',
            // Three rungs, then the Mitarbeiter and Juniorleiter rates.
            'Zusammenfassung!1:3',
            'Zusammenfassung!1:4',
            'Zusammenfassung!1:5',
            'Zusammenfassung!1:6',
            'Zusammenfassung!1:7',
        ]);
    });
});

describe('buildSheets — provenance', () => {
    it('records instance, retrieval time, version and scope', () => {
        const [, , method] = buildSheets(rows(2), META);
        const text = (method.data.flat() as AnyCell[])
            .map((cell) => (cell && typeof cell === 'object' ? String(cell.value ?? '') : ''))
            .join('\n');

        expect(text).toContain('https://example.church.tools');
        expect(text).toContain('1.8.0');
        expect(text).toContain('abc1234');
        expect(text).toContain('RR Musterstamm-MA (4 Teams)');
        // The data-quality counts travel with the file, not just the screen.
        expect(text).toContain(
            '1 Person. Wer beides nicht hat, wird zwangsläufig als Einzelkind geführt',
        );
        expect(text).toContain('2 Personen. Für diese greift Signal 1 nicht.');
    });
});

describe('exportFileName', () => {
    it('names the file after the due date', () => {
        expect(exportFileName(new Date(Date.UTC(2026, 11, 1)))).toBe(
            'RR-Beitraege-2026-12-01.xlsx',
        );
    });
});
