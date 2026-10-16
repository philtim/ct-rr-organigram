import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate/browser';
import type { ExportSheet } from './workbook';

/**
 * Give each formula in the written file its result.
 *
 * `write-excel-file` writes a formula without a cached result (`<f>` and no
 * `<v>`). Excel recalculates when editing is enabled — but a downloaded file
 * opens in Protected View, which does not, and neither do Quick Look, phone
 * viewers or a Drive preview. They show every fee and the grand total as 0.
 * The results are known: `workbook.ts` computes each one the way its formula
 * does and hands it over as the cell's `cached` value. This writes it next to
 * the formula, where Excel itself would put it.
 */
export type CachedValue = number | string;

type CachedCell = { cached?: CachedValue };

/** Cell address → result, per sheet; and the sheets without the extra field. */
export function takeCachedValues(sheets: ExportSheet[]): {
    sheets: ExportSheet[];
    values: Map<string, CachedValue>[];
} {
    const values = sheets.map(() => new Map<string, CachedValue>());
    const stripped = sheets.map((sheet, s) => ({
        ...sheet,
        data: sheet.data.map((row, r) =>
            row.map((cell, c) => {
                if (cell === null || cell === undefined || typeof cell !== 'object') return cell;
                const { cached, ...rest } = cell as typeof cell & CachedCell;
                if (cached === undefined) return cell;
                values[s].set(`${columnName(c)}${r + 1}`, cached);
                return rest as typeof cell;
            }),
        ),
    }));
    return { sheets: stripped, values };
}

/** 0 → A, 25 → Z, 26 → AA. */
function columnName(index: number): string {
    let name = '';
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    }
    return name;
}

const FORMULA_CELL = /<c r="([A-Z]+\d+)"([^>]*)><f>([^<]*)<\/f><\/c>/g;

/** One sheet's XML, each listed formula cell given its result. */
export function withCachedValues(
    sheetXml: string,
    values: ReadonlyMap<string, CachedValue>,
): string {
    return sheetXml.replace(FORMULA_CELL, (cell, address: string, attrs: string, f: string) => {
        const value = values.get(address);
        if (value === undefined) return cell;
        // A text result needs `t="str"`; a number is the default cell type.
        return typeof value === 'number'
            ? `<c r="${address}"${attrs}><f>${f}</f><v>${value}</v></c>`
            : `<c r="${address}"${attrs} t="str"><f>${f}</f><v>${escapeXml(value)}</v></c>`;
    });
}

function escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The same, applied to every worksheet of a written `.xlsx`, in sheet order. */
export function workbookWithCachedValues(
    xlsx: Uint8Array,
    values: ReadonlyMap<string, CachedValue>[],
): ReturnType<typeof zipSync> {
    const files = unzipSync(xlsx);
    values.forEach((sheetValues, i) => {
        const path = `xl/worksheets/sheet${i + 1}.xml`;
        const xml = files[path];
        if (xml) files[path] = strToU8(withCachedValues(strFromU8(xml), sheetValues));
    });
    return zipSync(files);
}
