import type { Sheet } from 'write-excel-file/browser';
import type { ExportRow } from '@/shared/rr/export-rows';
import { parseIsoDate } from '@/shared/rr/dates';
import type { DataQuality } from '@/shared/rr/data-quality';
import type { FeeTotals } from '@/shared/rr/fee-tiers';
import type { FeeConfig } from '@/shared/rr/types';

type FileContent = File | Blob | ArrayBuffer;
export type ExportSheet = Sheet<FileContent>;

/** Everything the workbook states about its own provenance. */
export type ExportMeta = {
    /** ChurchTools origin the figures were read from. */
    source: string;
    /** When the data was read — not when the file was written. */
    loadedAt: Date;
    dueDate: Date;
    /** Teilstamm group names in scope, and how many teams they resolved to. */
    stammNames: string[];
    teamCount: number;
    config: FeeConfig;
    totals: FeeTotals;
    quality: DataQuality;
    families: number;
    /** Extension version and commit, so a questioned figure leads back to code. */
    version: string;
    commit: string;
};

const SHEET_PARTICIPANTS = 'Teilnehmer';
const SHEET_SUMMARY = 'Zusammenfassung';
const SHEET_METHOD = 'Methodik & Quellen';

/** Yellow marks the two things a reader may safely change — and nothing else. */
const INPUT_FILL = '#FFF2CC';
const HEADER_FILL = '#E8EAED';
const STAFF_FILL = '#F2F3F5';
const DATE_FORMAT = 'dd.mm.yyyy';
const EURO_FORMAT = '#,##0.00" €"';

const EXEMPT_THIRD_CHILD = 'ab 3. Kind – beitragsfrei';
const EXEMPT_STAFF = 'Mitarbeiter – beitragsfrei';

const COLUMNS: Array<{ header: string; width: number }> = [
    { header: 'Nachname', width: 16 },
    { header: 'Vorname', width: 16 },
    { header: 'Geburtsdatum', width: 13 },
    { header: 'Alter am Stichtag', width: 11 },
    { header: 'PLZ', width: 8 },
    { header: 'Ort', width: 16 },
    { header: 'Straße', width: 26 },
    { header: 'Teilstamm', width: 24 },
    { header: 'Team(s)', width: 30 },
    { header: 'Familien-ID', width: 11 },
    { header: 'RR-Kinder in Familie', width: 11 },
    { header: 'Mitarbeiter (MA)', width: 10 },
    { header: 'Kind-Nr. (beitragspflichtig)', width: 13 },
    { header: 'Beitragspflicht', width: 15 },
    { header: 'Beitrag in €', width: 13 },
    { header: 'Hinweis', width: 26 },
    { header: 'Datenprüfung', width: 34 },
];

/**
 * The three sheets of the Beitragsabrechnung, as plain data.
 *
 * Built here rather than inside the `write-excel-file` call so the structure
 * is testable without the library — the formula ranges in particular, which
 * depend on the row count and would otherwise fail silently: a range one row
 * short drops a family member from a count and nothing in the file looks
 * wrong.
 *
 * **The workbook is a model, not a printout.** "RR-Kinder in Familie",
 * "Kind-Nr.", "Beitragspflicht", "Beitrag in €" and "Hinweis" are formulas
 * over the Familien-ID column and the two rates. Correct a family assignment
 * or change a rate and the whole list recomputes — which is what the office
 * actually needs in October, and what a static list cannot do.
 *
 * It is also a second opinion: those formulas recompute from scratch what
 * `assignFees` already decided, and the summary sheet subtracts the two. If
 * this code and the spreadsheet ever disagree, the workbook says so itself.
 */
export function buildSheets(rows: ExportRow[], meta: ExportMeta): ExportSheet[] {
    return [participantsSheet(rows), summarySheet(rows.length, meta), methodSheet(meta)];
}

function participantsSheet(rows: ExportRow[]): ExportSheet {
    const lastRow = rows.length + 1;
    const header = COLUMNS.map((column) => ({
        value: column.header,
        type: String,
        fontWeight: 'bold' as const,
        backgroundColor: HEADER_FILL,
        wrap: true,
        alignVertical: 'bottom' as const,
    }));

    const data: ExportSheet['data'] = [header];
    rows.forEach((row, index) => data.push(participantRow(row, index + 2, lastRow)));

    return {
        sheet: SHEET_PARTICIPANTS,
        data,
        columns: COLUMNS.map((column) => ({ width: column.width })),
        stickyRowsCount: 1,
    };
}

function participantRow(row: ExportRow, r: number, lastRow: number): ExportSheet['data'][number] {
    // A Mitarbeiter row is tinted so it reads as "exempt for a reason that has
    // nothing to do with siblings" at a glance.
    const tint = row.isStaff ? STAFF_FILL : undefined;
    const text = (value: string) => ({ value, type: String, backgroundColor: tint });
    const formula = (value: string) => ({
        value,
        type: 'Formula' as const,
        backgroundColor: tint,
    });

    return [
        text(row.lastName),
        text(row.firstName),
        {
            value: parseIsoDate(row.birthday) ?? undefined,
            type: Date,
            format: DATE_FORMAT,
            backgroundColor: tint,
        },
        { value: row.ageAtDueDate ?? undefined, type: Number, backgroundColor: tint },
        text(row.zip),
        text(row.city),
        text(row.street),
        text(row.stamm),
        text(row.teams),
        // The one column the office is meant to correct — hence the fill, and
        // hence every following column being a formula over it.
        { value: row.familyKey, type: String, backgroundColor: INPUT_FILL },
        formula(`COUNTIF($J$2:$J$${lastRow},$J${r})`),
        text(row.isStaff ? 'ja' : 'nein'),
        formula(`IF($L${r}="ja","",COUNTIFS($J$2:$J${r},$J${r},$L$2:$L${r},"nein"))`),
        formula(`IF($L${r}="ja","beitragsfrei",IF($M${r}>=3,"beitragsfrei","beitragspflichtig"))`),
        {
            value: `IF($N${r}="beitragsfrei",0,IF($M${r}=1,${SHEET_SUMMARY}!$B$4,${SHEET_SUMMARY}!$B$5))`,
            type: 'Formula' as const,
            format: EURO_FORMAT,
            backgroundColor: tint,
        },
        formula(`IF($L${r}="ja","${EXEMPT_STAFF}",IF($M${r}>=3,"${EXEMPT_THIRD_CHILD}",""))`),
        { value: row.reviewNote, type: String, backgroundColor: tint, wrap: true },
    ];
}

function summarySheet(rowCount: number, meta: ExportMeta): ExportSheet {
    const last = rowCount + 1;
    const T = (column: string) => `${SHEET_PARTICIPANTS}!$${column}$2:$${column}$${last}`;

    const title = (value: string) => [
        { value, type: String, fontWeight: 'bold' as const, fontSize: 14 },
    ];
    const section = (value: string) => [{ value, type: String, fontWeight: 'bold' as const }];
    const label = (value: string) => ({ value, type: String });
    const count = (value: string) => ({ value, type: 'Formula' as const });
    const euro = (value: string) => ({
        value,
        type: 'Formula' as const,
        format: EURO_FORMAT,
    });
    const rate = (cents: number) => ({
        value: cents / 100,
        type: Number,
        format: EURO_FORMAT,
        backgroundColor: INPUT_FILL,
    });

    return {
        sheet: SHEET_SUMMARY,
        columns: [{ width: 38 }, { width: 14 }, { width: 16 }],
        data: [
            title(`RR Beiträge zum ${formatDate(meta.dueDate)} — Zusammenfassung`),
            [],
            section('EINGABE — Beitragssätze'),
            [label('Beitrag 1. Kind (€)'), rate(meta.config.firstChildCents)],
            [label('Beitrag 2. Kind (€)'), rate(meta.config.secondChildCents)],
            [label('ab dem 3. Kind'), label('beitragsfrei')],
            [],
            [label('Aktive RR Teilnehmer (gelistet)'), count(`COUNTA(${T('A')})`)],
            [label('davon beitragspflichtig'), count(`COUNTIF(${T('N')},"beitragspflichtig")`)],
            [label('davon beitragsfrei'), count(`COUNTIF(${T('N')},"beitragsfrei")`)],
            [],
            [
                label('Kinder zum Satz 1. Kind'),
                count(`COUNTIFS(${T('N')},"beitragspflichtig",${T('M')},1)`),
                euro('B12*$B$4'),
            ],
            [
                label('Kinder zum Satz 2. Kind'),
                count(`COUNTIFS(${T('N')},"beitragspflichtig",${T('M')},2)`),
                euro('B13*$B$5'),
            ],
            [],
            [
                { value: 'Gesamtbetrag (€)', type: String, fontWeight: 'bold' as const },
                undefined,
                {
                    value: `SUM(${T('O')})`,
                    type: 'Formula' as const,
                    format: EURO_FORMAT,
                    fontWeight: 'bold' as const,
                },
            ],
            [],
            section('Grund der Beitragsfreiheit'),
            [label('    Mitarbeiter (MA)'), count(`COUNTIF(${T('L')},"ja")`)],
            [
                label('    ab 3. Kind der Familie'),
                count(`COUNTIF(${T('P')},"${EXEMPT_THIRD_CHILD}")`),
            ],
            [],
            [label('Familien insgesamt'), { value: meta.families, type: Number }],
            [
                label('Familien mit 3 oder mehr RR-Kindern'),
                { value: meta.totals.familiesWithThreeOrMore, type: Number },
            ],
            [],
            section('Kontrolle'),
            [label('Summe der beiden Staffeln'), undefined, euro('C12+C13')],
            [label('Abweichung zum Gesamtbetrag'), undefined, euro('C15-C25')],
            // The figure the web view showed, written as a plain number. If the
            // spreadsheet's own arithmetic disagrees with the extension's, this
            // row is where it becomes visible — to the reader, not just to us.
            [
                label('Kennzahl der Web-Ansicht'),
                undefined,
                {
                    value: meta.totals.totalCents / 100,
                    type: Number,
                    format: EURO_FORMAT,
                },
            ],
            [label('Abweichung zur Web-Ansicht'), undefined, euro('C15-C27')],
        ],
    };
}

function methodSheet(meta: ExportMeta): ExportSheet {
    const section = (value: string) => [{ value, type: String, fontWeight: 'bold' as const }];
    const entry = (label: string, text: string) => [
        { value: label, type: String, alignVertical: 'top' as const },
        { value: text, type: String, wrap: true, alignVertical: 'top' as const },
    ];

    const scope =
        meta.stammNames.length > 0
            ? `${meta.stammNames.join(', ')} (${meta.teamCount} Teams)`
            : `${meta.teamCount} Teams`;

    return {
        sheet: SHEET_METHOD,
        columns: [{ width: 34 }, { width: 110 }],
        data: [
            [
                {
                    value: 'Datenquelle & Regeln',
                    type: String,
                    fontWeight: 'bold' as const,
                    fontSize: 14,
                },
            ],
            [],
            entry(
                'Quelle',
                `ChurchTools ${meta.source}, abgerufen am ${formatDateTime(meta.loadedAt)}`,
            ),
            entry('Erzeugt von', `RR Dashboard ${meta.version} (${meta.commit})`),
            entry(
                'Stichtag Beitrag',
                `${formatDate(meta.dueDate)} — die Altersangaben beziehen sich auf dieses Datum.`,
            ),
            entry(
                'Beitragssätze',
                `1. Kind ${formatEuroPlain(meta.config.firstChildCents)}, 2. Kind ` +
                    `${formatEuroPlain(meta.config.secondChildCents)}, jedes weitere Kind ` +
                    'beitragsfrei. Die Sätze stehen in den gelb hinterlegten Zellen B4/B5 des ' +
                    'Blattes "Zusammenfassung" und lassen sich dort ändern — die ganze Liste ' +
                    'rechnet dann neu.',
            ),
            [],
            section('Wer ist "aktiver RR Teilnehmer"?'),
            entry(
                'Definition',
                'Jede Person mit aktiver Mitgliedschaft in einer der RR-Teamgruppen ' +
                    '(Gruppentyp Kleingruppe), deren Rolle dort keine Leitungs- oder ' +
                    'Mitarbeiterrolle ist. Welche Rollen als Leitung gelten, kommt aus den ' +
                    'ChurchTools-Rollendefinitionen — dieselbe Regel, die der Organigramm-Tab ' +
                    'für seine Leiter-Kennzahl verwendet.',
            ),
            entry('Erfasster Bereich', scope),
            entry(
                'Nicht erfasst',
                'Teams unter Teilstämmen, die in der Konfiguration der Extension nicht ' +
                    'ausgewählt sind, sind nicht enthalten — ebenso Mitgliedschaften mit einem ' +
                    'anderen Status als "aktiv".',
            ),
            entry(
                'Keine Merkmalsgruppen',
                'Teilnehmer- und Mitarbeiter-Status werden aus den Gruppenrollen abgeleitet, ' +
                    'nicht aus den ChurchTools-Merkmalen "RR Teilnehmer" / "RR Mitarbeiter". ' +
                    'Diese werden nachts neu berechnet; eine heute eingetragene Mitgliedschaft ' +
                    'fehlt dort noch. Die Rollen sind in dem Moment aktuell, in dem jemand ' +
                    'speichert.',
            ),
            [],
            section('Beitragsfreiheit'),
            entry(
                'Mitarbeiter sind beitragsfrei',
                'Gilt für den eigenen Mitarbeiter-Status der Person, nicht den der Eltern. ' +
                    'Spalte "Mitarbeiter (MA)" = ja; diese Zeilen sind grau hinterlegt.',
            ),
            entry(
                'Ab dem 3. Kind beitragsfrei',
                'Je Familie werden die beitragspflichtigen Kinder ab 1 gezählt (Spalte ' +
                    '"Kind-Nr."). Kind 1 zahlt den ersten Satz, Kind 2 den zweiten, ab Kind 3 ' +
                    'ist es beitragsfrei.',
            ),
            entry(
                'Mitarbeiter zählen nicht mit',
                'Ein Kind mit MA-Status wird aus der Zählung herausgenommen und die übrigen ' +
                    'Kinder werden neu ab 1 gezählt. Beispiel: 3 Kinder, das älteste ist MA → ' +
                    'die beiden jüngeren zahlen ersten und zweiten Satz, erst ein 4. Kind wäre ' +
                    'frei.',
            ),
            entry(
                'Zählreihenfolge',
                'Innerhalb einer Familie das älteste Kind zuerst — die Reihenfolge der Zeilen ' +
                    'auf dem Blatt "Teilnehmer". Welches Geschwisterkind als "Kind 3" markiert ' +
                    'ist, wurde als unerheblich festgelegt; der Familien-Gesamtbetrag ist in ' +
                    'jeder Reihenfolge gleich.',
            ),
            [],
            section('Geschwister-Erkennung'),
            entry(
                'Signal 1',
                'ChurchTools-Beziehungen: gemeinsames Elternteil (Typ "Eltern-Kind") oder eine ' +
                    'direkte "Geschwister"-Beziehung.',
            ),
            entry(
                'Signal 2',
                'Gleiche Adresse (PLZ + Straße, schreibweisennormalisiert) UND gleicher ' +
                    'Nachname.',
            ),
            entry(
                'Warum beides',
                'Das Beziehungsfeld allein übersieht Geschwisterpaare, bei denen die Beziehung ' +
                    'in ChurchTools nicht gepflegt ist. Die Adresse allein führt zu Fehltreffern ' +
                    'in Mehrfamilienhäusern; der Nachnamen-Abgleich verhindert sie.',
            ),
            entry(
                'Spalte "Familien-ID"',
                'Gleiche ID = erkannte Geschwister. Das ist die einzige Spalte, die korrigiert ' +
                    'werden soll (gelb hinterlegt) — "RR-Kinder in Familie", "Kind-Nr.", ' +
                    '"Beitragspflicht", "Beitrag in €" und "Hinweis" sind Formeln und rechnen ' +
                    'automatisch nach.',
            ),
            [],
            section('Datenlücken in dieser Auswertung'),
            entry(
                'Ohne vollständige Adresse',
                `${people(meta.quality.missingAddress)}. Für diese greift Signal 2 nicht.`,
            ),
            entry(
                'Ohne Beziehung zu anderen Teilnehmern',
                `${people(meta.quality.withoutRelationship)}. Für diese greift Signal 1 nicht.`,
            ),
            entry(
                'Ohne Geburtsdatum',
                `${people(meta.quality.missingBirthday)}. Betrifft nur die Zählreihenfolge, ` +
                    'nicht den Familien-Gesamtbetrag.',
            ),
            entry(
                'Weder Adresse noch Beziehung',
                `${people(meta.quality.unmatchable)}. Wer beides nicht hat, wird ` +
                    'zwangsläufig als Einzelkind geführt und zahlt den ersten Satz — auch ' +
                    'wenn Geschwister im Stamm sind. Die betroffenen Zeilen sind in der ' +
                    'Spalte "Datenprüfung" markiert; korrigieren lässt sich das nur in ' +
                    'ChurchTools.',
            ),
            [],
            section('Kontrolle'),
            entry(
                'Abweichung zum Gesamtbetrag',
                'Vergleicht die Summe der Einzelbeträge mit der Summe der beiden Staffeln. ' +
                    'Diese Zeile muss immer 0,00 € zeigen — alles andere wäre ein Fehler in ' +
                    'der Datei.',
            ),
            entry(
                'Abweichung zur Web-Ansicht',
                'Vergleicht die Datei mit dem Betrag, den die Extension beim Export angezeigt ' +
                    'hat — zwei voneinander unabhängige Rechnungen derselben Regeln. Solange ' +
                    'in der Datei nichts geändert wurde, muss hier 0,00 € stehen. Nach einer ' +
                    'Korrektur an einer Familien-ID oder an den Beitragssätzen zeigt die Zeile, ' +
                    'um wie viel sich der Gesamtbetrag dadurch verschoben hat.',
            ),
            entry(
                'Personenbezogene Daten',
                'Diese Datei enthält Namen, Geburtsdaten und Adressen von Minderjährigen. Die ' +
                    'Web-Ansicht der Extension zeigt ausschließlich Summen; die Personendaten ' +
                    'existieren nur in dieser Datei. Entsprechend aufbewahren und nach dem ' +
                    'Einzug löschen.',
            ),
        ],
    };
}

function people(count: number): string {
    return `${count} ${count === 1 ? 'Person' : 'Personen'}`;
}

/** `01.12.2026` — explicit rather than `dateStyle: 'short'`, which abbreviates the year. */
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(date);
}

function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(
        date,
    );
}

function formatEuroPlain(cents: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
        cents / 100,
    );
}

/** `RR-Beitraege-2026-12-01.xlsx` — the due date, so two years never collide. */
export function exportFileName(dueDate: Date): string {
    const iso = dueDate.toISOString().slice(0, 10);
    return `RR-Beitraege-${iso}.xlsx`;
}
