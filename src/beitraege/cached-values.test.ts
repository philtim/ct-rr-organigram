import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate/browser';
import writeXlsxFile from 'write-excel-file/universal';
import type { Sheet } from 'write-excel-file/universal';
import { takeCachedValues, withCachedValues, workbookWithCachedValues } from './cached-values';
import { buildExportRows } from './export-rows';
import { assignFees, summarize } from './fee-tiers';
import { buildSheets } from './workbook';
import type { ExportMeta } from './workbook';
import type { Family, RrParticipant } from './types';
import type { FeeConfig } from '@/shared/settings';

const CONFIG: FeeConfig = { childCents: [8000, 6000, 0], staffCents: 0, juniorLeaderCents: 2500 };
const DUE = new Date(Date.UTC(2026, 11, 1));

const person = (personId: number, lastName: string, birthday: string): RrParticipant => ({
    personId,
    firstName: `P${personId}`,
    lastName,
    birthday,
    street: 'Weg 1',
    zip: '70000',
    city: 'Ort',
    teamNames: ['Team'],
    stammNames: ['Stamm'],
});

/**
 * Two families through the real fee rules: a Mitarbeiter and three children
 * (first, second, free third), and a Juniorleiter with a younger sibling.
 */
function fixture() {
    const participants = [
        person(1, 'Albers', '2004-01-01'),
        person(2, 'Albers', '2012-01-01'),
        person(3, 'Albers', '2014-01-01'),
        person(4, 'Albers', '2016-01-01'),
        person(5, 'Berg', '2010-01-01'),
        person(6, 'Berg', '2015-01-01'),
    ];
    const families: Family[] = [
        { key: 'F001', personIds: [1, 2, 3, 4] },
        { key: 'F002', personIds: [5, 6] },
    ];
    const assignments = assignFees(participants, families, new Set([1, 5]), new Set([5]), CONFIG);
    const totals = summarize(assignments, families, CONFIG.childCents.length);
    const rows = buildExportRows(participants, assignments, new Map(), DUE);
    const meta: ExportMeta = {
        source: 'https://example.church.tools',
        loadedAt: new Date('2026-10-09T08:30:00Z'),
        dueDate: DUE,
        stammNames: ['Stamm'],
        teamCount: 1,
        config: CONFIG,
        totals,
        quality: { missingAddress: 0, missingBirthday: 0, withoutRelationship: 0, unmatchable: 0 },
        families: 2,
        version: '0.0.0',
        commit: 'test',
    };
    return { rows, totals, meta };
}

/** The cached value at a sheet's cell next to the given label in column A. */
function besideLabel(
    sheet: ReturnType<typeof buildSheets>[number],
    values: Map<string, unknown>,
    label: string,
    column: 'B' | 'C',
) {
    const row = sheet.data.findIndex(
        (r) => (r[0] as { value?: unknown } | undefined)?.value === label,
    );
    expect(row, label).toBeGreaterThanOrEqual(0);
    return values.get(`${column}${row + 1}`);
}

describe('cached formula results', () => {
    it('match what the extension itself computed, row by row', () => {
        const { rows, meta } = fixture();
        const { values } = takeCachedValues(buildSheets(rows, meta));
        rows.forEach((row, i) => {
            const r = i + 2;
            // O: Beitrag, M: Kind-Nr.
            expect(values[0].get(`O${r}`), `fee row ${r}`).toBe(row.amountCents / 100);
            expect(values[0].get(`M${r}`), `child no row ${r}`).toBe(row.payingPosition ?? '');
        });
    });

    it('carry the grand total the view showed, and no difference in the control', () => {
        const { rows, totals, meta } = fixture();
        const sheets = buildSheets(rows, meta);
        const { values } = takeCachedValues(sheets);
        const summary = sheets[1];
        expect(besideLabel(summary, values[1], 'Gesamtbetrag (€)', 'C')).toBe(
            totals.totalCents / 100,
        );
        expect(besideLabel(summary, values[1], 'Abweichung zum Gesamtbetrag', 'C')).toBe(0);
        expect(besideLabel(summary, values[1], 'Abweichung zur Web-Ansicht', 'C')).toBe(0);
        expect(besideLabel(summary, values[1], 'davon beitragspflichtig', 'B')).toBe(totals.liable);
    });

    it('leave the library nothing it does not know', () => {
        const { rows, meta } = fixture();
        const { sheets } = takeCachedValues(buildSheets(rows, meta));
        const json = JSON.stringify(sheets);
        expect(json).not.toContain('"cached"');
    });
});

describe('withCachedValues', () => {
    it('writes a number as the value, a text with t="str", and escapes it', () => {
        const xml =
            '<c r="O2" s="3"><f>IF(A1,1,0)</f></c><c r="P2"><f>IF(A1,"a","b")</f></c>' +
            '<c r="Q2"><f>SUM(A1)</f></c>';
        const values = new Map<string, string | number>([
            ['O2', 80],
            ['P2', 'A & B'],
        ]);
        expect(withCachedValues(xml, values)).toBe(
            '<c r="O2" s="3"><f>IF(A1,1,0)</f><v>80</v></c>' +
                '<c r="P2" t="str"><f>IF(A1,"a","b")</f><v>A &amp; B</v></c>' +
                '<c r="Q2"><f>SUM(A1)</f></c>',
        );
    });
});

/**
 * The patch above matches the XML `write-excel-file` writes today. Should an
 * update write formulas any other way, it would stop matching without a
 * sound, and the fees would read 0 in Protected View again. This writes the
 * real export with the real library to catch exactly that.
 */
describe('workbookWithCachedValues', () => {
    it("gives the library's own formulas their results", async () => {
        const { rows, totals, meta } = fixture();
        const { sheets, values } = takeCachedValues(buildSheets(rows, meta));
        // The universal build types file content as Blob; these sheets carry none.
        const blob = await writeXlsxFile(sheets as Sheet<Blob>[]).toBlob();
        const files = unzipSync(
            workbookWithCachedValues(new Uint8Array(await blob.arrayBuffer()), values),
        );
        const participants = strFromU8(files['xl/worksheets/sheet1.xml']);
        const summary = strFromU8(files['xl/worksheets/sheet2.xml']);
        expect(participants).toMatch(/<c r="O3"[^>]*><f>[^<]+<\/f><v>80<\/v><\/c>/);
        expect(participants).toMatch(
            /<c r="N3"[^>]*t="str"><f>[^<]+<\/f><v>beitragspflichtig<\/v>/,
        );
        expect(summary).toContain(`<v>${totals.totalCents / 100}</v>`);
        // Every formula in both sheets got a result.
        expect(participants + summary).not.toMatch(/<\/f><\/c>/);
    });
});
