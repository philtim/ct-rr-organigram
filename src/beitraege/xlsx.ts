import writeXlsxFile from 'write-excel-file/browser';
import { takeCachedValues, workbookWithCachedValues } from './cached-values';
import type { ExportSheet } from './workbook';

/**
 * The only module that pulls in `write-excel-file` (ADR-010).
 *
 * Imported dynamically by its caller, so the library lands in its own chunk
 * and the initial bundle — which every viewer of the organigram downloads —
 * never carries a spreadsheet writer it has no use for. Keep this file free of
 * anything but the write call for the same reason: whatever is imported here
 * is imported with the library.
 *
 * Its zip backend is redirected to a synchronous one in `vite.config.ts`,
 * because the host's CSP refuses the Web Worker the asynchronous one spawns
 * (ADR-012, `./fflate-sync.ts`). The same synchronous `fflate` reopens the
 * file once to add the formulas' results.
 */
export async function downloadWorkbook(sheets: ExportSheet[], fileName: string): Promise<void> {
    // Each formula's result goes in after writing (`./cached-values.ts`), so
    // Protected View and previews show the fees rather than zeros.
    const { sheets: plain, values } = takeCachedValues(sheets);
    const blob = await writeXlsxFile(plain, { fontFamily: 'Arial', fontSize: 11 }).toBlob();
    const patched = workbookWithCachedValues(new Uint8Array(await blob.arrayBuffer()), values);
    save(new Blob([patched], { type: blob.type }), fileName);
}

function save(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
