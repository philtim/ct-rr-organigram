/**
 * Centralized constants and copy strings.
 * UI strings live here (German only in v1) so future i18n is a one-file change.
 */

export const EXTENSION_KEY = import.meta.env.VITE_KEY;

export const KV_CATEGORY_SHORTY = 'settings';
export const KV_GATE_GROUP_ID_FIELD = 'gateGroupId';

/** Hard timeout per outbound API call (US-5 non-functional req). */
export const API_TIMEOUT_MS = 30_000;

/**
 * Role names (lowercased) that count as "Leiter" in the stat tiles,
 * beyond ChurchTools' built-in `role.isLeader === true` flag. Matches
 * the auto-membership rule of the "RR Mitarbeiter" group on the live
 * instance, which considers everyone with a Mitarbeiter/Teamhelfer/
 * Organisator role on any RR group an MA — even when the role itself
 * has isLeader=false.
 */
export const LEADER_ROLE_NAMES: ReadonlySet<string> = new Set([
    'leiter',
    'co-leiter',
    'coleiter',
    'mitarbeiter',
    'teamhelfer',
    'organisator',
]);

/**
 * Leadership roles that stay visible on a Teilstamm card even when nobody
 * holds them — a vacant Stammwart is worth seeing, a missing Stammhelfer is
 * not. ChurchTools has no flag that tells a vacancy apart from an optional
 * position, so this list is deliberately hardcoded (decision 2026-10-02).
 * Compare lowercased; this is the single place to adapt for another
 * installation's role names.
 */
export const ALWAYS_SHOWN_LEADER_ROLES: ReadonlySet<string> = new Set(['stammleiter', 'stammwart']);

/** UI copy. */
export const COPY = {
    appTitle: 'RR Mitarbeiter-Dashboard',
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
    beitraegeAccessDenied:
        'Die Beitragsabrechnung ist der Hauptstammleitung vorbehalten. Falls du Zugriff ' +
        'brauchst, wende dich an den Stammleiter.',
    beitraegeSetupHint:
        'Die Beitragsabrechnung ist noch für keine Rolle freigegeben und bleibt deshalb ' +
        'für alle verborgen.',
    beitraegeSetupHintLink: 'Jetzt konfigurieren',
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
    feesExemptThirdChild: 'davon ab 3. Kind',
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
    jahresmeldungColUnassigned: 'ohne Zuordnung',
    jahresmeldungColUnassignedNote: 'ohne Zuordnung, nicht Teil des Formulars',
    jahresmeldungRowTotal: 'Gesamt',
    jahresmeldungSummenTitle: 'Summen',
    jahresmeldungSumEntdecker: 'Gesamt Entdecker',
    jahresmeldungSumOhneEntdecker: 'Gesamt Rangers und Leiter (ohne Entdecker)',
    jahresmeldungSumStamm: 'Gesamt Stamm',
    jahresmeldungSumUnknown: 'Kein Teilstamm als Entdecker erkennbar.',
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
    jahresmeldungQualityTitle: 'Datenqualität',
    jahresmeldungQualityNone: 'Alle Personen konnten einer Spalte des Formulars zugeordnet werden.',
    jahresmeldungQualityLead: (count: number) =>
        `${count} ${count === 1 ? 'Person fehlt' : 'Personen fehlen'} in den Formularspalten, ` +
        `${count === 1 ? 'zählt' : 'zählen'} aber in „Gesamt Stamm".`,
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
