/**
 * Centralized constants and copy strings.
 * UI strings live here (German only in v1) so future i18n is a one-file change.
 */

export const EXTENSION_KEY = import.meta.env.VITE_KEY;

export const KV_CATEGORY_SHORTY = 'settings';
export const KV_GATE_GROUP_ID_FIELD = 'gateGroupId';

/** Hard timeout per outbound API call (US-5 non-functional req). */
export const API_TIMEOUT_MS = 30_000;

/** UI copy. */
export const COPY = {
    appTitle: 'RR Mitarbeiter-Dashboard',
    configMissing:
        'Diese Ansicht ist noch nicht konfiguriert. Unter Admin → Extensions müssen ' +
        'Hauptstamm-Gruppe, Teilstämme und die Gruppentypen der Teams festgelegt werden.',
    feesNotConfigured:
        'Für die Beitragsabrechnung sind noch keine Beitragssätze hinterlegt. Die Staffel ' +
        'wird unter Admin → Extensions festgelegt.',
    refresh: 'Aktualisieren',
    timestampPrefix: 'Stand: ',
    accessDenied: 'Du hast keinen Zugriff auf das RR Mitarbeiter-Dashboard.',
    partialErrorToast: 'Einige Daten konnten nicht geladen werden.',
    loading: 'Lädt …',
    // Leader lists are labelled with the group role's own name, straight from
    // ChurchTools — see `groupLeadersByRole` in dashboard/counts.ts. The labels
    // below are only for the stat tiles and the "?" error state.
    teamleiterStat: 'Teamleiter',
    leiterStat: 'Leiter',
    mitgliederStat: 'Teilnehmer',
    gesamtStat: 'Gesamt',
    horizontStat: 'Benötigte Horizonte',
    /** Shown in place of a name when a leadership position is unfilled. */
    vacantRole: 'nicht besetzt',
    // Tabs (ADR-007).
    tabOrganigram: 'Organigramm',
    tabBeitraege: 'Beitragsabrechnung',
    beitraegeTitle: 'RR Beitragsabrechnung',
    beitraegeLoadError: 'Die Beitragsdaten konnten nicht geladen werden.',
    beitraegeAggregatesOnly:
        'Diese Ansicht zeigt ausschließlich Summen. Namen, Geburtsdaten und Adressen ' +
        'stehen nur in der Export-Datei.',
    feesTotalLabel: 'Einzuziehender Gesamtbetrag',
    feesOrganigramTitle: 'Abgleich mit dem Organigramm',
    feesLeaders: 'Leiter',
    feesMembers: 'Mitglieder',
    feesReconciliation: (members: number, staffChildren: number, participants: number) =>
        `Dieselben Zahlen wie im Tab „Organigramm", aus denselben Daten nach denselben ` +
        `Regeln. Die Abrechnung zählt zusätzlich die ${staffChildren} Mitarbeiter, die ` +
        `selbst Teilnehmer sind: ${members} + ${staffChildren} = ${participants}. Im ` +
        'Organigramm stehen sie bei den Leitern, hier als beitragsfreie Teilnehmer.',
    feesPeopleTitle: 'Teilnehmer',
    feesParticipants: 'Teilnehmer gesamt',
    feesLiable: 'beitragspflichtig',
    feesExempt: 'beitragsfrei',
    feesExemptStaff: 'davon Mitarbeiter',
    feesExemptLadder: 'davon beitragsfreie Kinder',
    feesFamiliesTitle: 'Familien',
    feesFamilies: 'Familien gesamt',
    feesFamiliesThreePlus: 'mit 3+ RR-Kindern',
    feesQualityTitle: 'Unvollständige Daten',
    feesQualityHint: (count: number) =>
        `${count} ${count === 1 ? 'Teilnehmer hat' : 'Teilnehmer haben'} weder eine Adresse ` +
        `noch eine Beziehung zu ${count === 1 ? 'einem anderen' : 'anderen'} Teilnehmer` +
        `${count === 1 ? '' : 'n'} und ${count === 1 ? 'gilt' : 'gelten'} deshalb als ` +
        'Einzelkind. Falls es Geschwister gibt, wird zu viel berechnet — die Lücke muss ' +
        'in ChurchTools geschlossen werden.',
    feesMissingAddress: 'ohne Adresse',
    feesMissingRelationship: 'ohne Beziehung',
    feesMissingBirthday: 'ohne Geburtsdatum',
    // Export (ADR-010).
    feesExportTitle: 'Liste für das Gemeindebüro',
    feesExportButton: 'Excel-Liste herunterladen',
    feesExportWorking: 'Datei wird erzeugt …',
    feesExportError: 'Die Datei konnte nicht erzeugt werden. Bitte erneut versuchen.',
    feesExportHint: (dueDate: string) =>
        `Enthält alle Teilnehmer mit Name, Geburtsdatum und Adresse sowie den Beitrag zum ` +
        `${dueDate}. Beitragssätze und Familienzuordnung lassen sich in der Datei ändern — ` +
        'sie rechnet dann neu.',
    feesExportPrivacy:
        'Die Datei enthält Adressen von Minderjährigen. Nur an das Gemeindebüro ' +
        'weitergeben und nach dem Einzug löschen.',
    // Jahresmeldung. The column headings deliberately repeat the wording of
    // the Bund's "Mitgliederzahlen" form, so that abtippen needs no mental
    // translation step (docs/design/001-jahresmeldung.md).
    tabJahresmeldung: 'Jahresmeldung',
    jahresmeldungTitle: 'RR Jahresmeldung',
    jahresmeldungIntro:
        'Aktueller Stand aus ChurchTools, gegliedert wie das Formular „Mitgliederzahlen" ' +
        'im Bundesportal. Zeilen und Spalten stehen in derselben Reihenfolge.',
    jahresmeldungTableTitle: 'Mitgliederzahlen',
    jahresmeldungTableCaption: 'Mitgliederzahlen für die Jahresmeldung an den Bund',
    jahresmeldungScope: (teams: number) =>
        `Grundlage: ${teams} ${teams === 1 ? 'Team' : 'Teams'} unter den konfigurierten Teilstämmen.`,
    jahresmeldungColJungen: 'Jungen',
    jahresmeldungColMaedchen: 'Mädchen',
    jahresmeldungColJuniorM: 'Juniorleiter männlich',
    jahresmeldungColJuniorW: 'Juniorleiter weiblich',
    jahresmeldungColMitarbeiterM: 'Mitarbeiter männlich',
    jahresmeldungColMitarbeiterW: 'Mitarbeiter weiblich',
    jahresmeldungColTeilnehmer: 'Teilnehmer gesamt, nicht Teil des Formulars',
    jahresmeldungColLeiter: 'Leiter gesamt einschließlich Juniorleiter, nicht Teil des Formulars',
    jahresmeldungColGesamt: 'Personen gesamt in dieser Zeile, nicht Teil des Formulars',
    jahresmeldungRollupHint:
        'Die drei rechten Spalten sind Summen für den eigenen Gebrauch und gehören nicht ' +
        'ins Bundesformular.',
    jahresmeldungColUnassigned: 'ohne Zuordnung',
    jahresmeldungColUnassignedNote: 'ohne Zuordnung, nicht Teil des Formulars',
    jahresmeldungRowTotal: 'Gesamt',
    jahresmeldungUnassignedHint: 'Diese Spalte gehört nicht ins Bundesformular.',
    jahresmeldungMethodTitle: 'Wie wird gezählt?',
    /**
     * Every cell of the table, explained — so the figures can be defended
     * against a query from the Bundesgeschäftsstelle without reading the code.
     */
    jahresmeldungMethod: [
        {
            term: 'Zeile',
            text:
                'Der Teilstamm, unter dem die Person in einem Team steht. Wer in keinem Team ' +
                'steht, aber Mitarbeiter ist, zählt unter „Mitarbeiter ohne Team".',
        },
        {
            term: 'Jungen / Mädchen',
            text: 'Teilnehmer ohne Leitungs- oder Mitarbeiterrolle.',
        },
        {
            term: 'Juniorleiter',
            text:
                'Leiter unter 18 Jahren. Sie zählen nicht zusätzlich bei Jungen/Mädchen — ' +
                'ein Pfadranger, der leitet, erscheint also nur hier.',
        },
        {
            term: 'Mitarbeiter',
            text:
                'Leiter ab 18 Jahren. Als Leitungsrolle gelten Leiter, Co-Leiter, ' +
                'Mitarbeiter, Teamhelfer und Organisator.',
        },
        {
            term: 'Mehrfach',
            text:
                'Wer in zwei Teams steht, zählt einmal — bei mehreren Teilstämmen dort, wo ' +
                'die Person leitet.',
        },
        {
            term: 'Stand',
            text: 'Alle Zahlen beziehen sich auf jetzt, nicht auf einen Stichtag.',
        },
    ],
    jahresmeldungCopied: (value: number) => `${value} kopiert`,
    jahresmeldungCopyHint: 'Klick auf eine Zahl kopiert sie.',
    jahresmeldungUnknownCell: 'unbekannt, Daten konnten nicht vollständig geladen werden',
    jahresmeldungIncomplete:
        'Nicht alle Teams konnten geladen werden. Die mit „?" markierten Zahlen sind ' +
        'unvollständig — bitte nicht melden, sondern neu laden.',
    jahresmeldungNoTeilstaemme:
        'Es sind keine Teilstämme konfiguriert. Ohne diese Auswahl steht nicht fest, welche ' +
        'Teams in die Meldung gehören — bitte zuerst in der Konfiguration festlegen.',
    jahresmeldungLoadError: 'Die Zahlen für die Jahresmeldung konnten nicht geladen werden.',
    jahresmeldungOhneTeamTitle: 'Mitarbeiter ohne Team',
    jahresmeldungOhneTeamHint:
        'Mitarbeiter des Hauptstamms oder eines Teilstamms, die in keinem Team stehen. ' +
        'Wer hier unerwartet auftaucht, ist meist aus einem Team ausgetragen worden, ohne ' +
        'aus dem Teilstamm entfernt zu werden.',
    jahresmeldungOhneTeamEmpty: 'Alle Mitarbeiter stehen in mindestens einem Team.',
    jahresmeldungQualityTitle: 'Datenqualität',
    jahresmeldungQualityNone: 'Alle Personen konnten einer Spalte des Formulars zugeordnet werden.',
    jahresmeldungQualityLead: (count: number) =>
        `${count} ${count === 1 ? 'Person fehlt' : 'Personen fehlen'} in den Formularspalten, ` +
        `${count === 1 ? 'zählt' : 'zählen'} aber in der Spalte „Gesamt".`,
    jahresmeldungQualityGenderMissing: 'Geschlecht nicht gepflegt',
    jahresmeldungQualityGenderMissingHint: 'In ChurchTools nachtragen, dann neu laden.',
    jahresmeldungQualityGenderDiverse: 'Geschlecht divers',
    jahresmeldungQualityGenderDiverseHint:
        'Vollständig erfasst — das Formular kennt dafür nur zwei Spalten. Hier ist nichts zu ' +
        'korrigieren; wie gemeldet wird, entscheidet die Stammleitung.',
    jahresmeldungQualityAgeUnknown: 'Leiter ohne Geburtsdatum',
    jahresmeldungQualityAgeUnknownHint:
        'Ohne Geburtsdatum lässt sich Mitarbeiter nicht von Juniorleiter unterscheiden.',
    jahresmeldungQualityMulti: 'In mehreren Teilstämmen aktiv',
    jahresmeldungQualityMultiHint: 'Jeweils einmal gezählt, in der genannten Zeile.',
    jahresmeldungQualityCountedIn: (row: string) => `gezählt bei: ${row}`,
    jahresmeldungQualityPersonLink: 'In ChurchTools',
    jahresmeldungQualityShowAll: (rest: number) => `Alle anzeigen (${rest} weitere)`,
} as const;
