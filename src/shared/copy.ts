/**
 * Every piece of text the extension shows, in one place — German only, so a
 * translation or a wording change is a one-file change. Components name a
 * key; they do not carry text of their own.
 *
 * Not in here: the export file's content (beitraege/workbook.ts), which is a
 * document of its own; the module and category names the extension stores in
 * ChurchTools (admin/useAdminSettings.ts), which are data; and console
 * messages, which nobody using the extension reads.
 */
const teamCount = (n: number) => `${n} ${n === 1 ? 'Team' : 'Teams'}`;

export const COPY = {
    appTitle: 'RR Mitarbeiter-Dashboard',
    configUnreadable:
        'Die Konfiguration konnte nicht gelesen werden. Das heißt nicht, dass keine ' +
        'vorhanden ist — bitte die Seite neu laden. Hält das an, fehlen vermutlich die ' +
        'Rechte auf das Modul.',
    configMissing:
        'Diese Ansicht ist noch nicht konfiguriert. Unter Admin → Extensions müssen ' +
        'Hauptstamm-Gruppe, Teilstämme und die Gruppentypen der Teams festgelegt werden.',
    noTeamsInScope:
        'Unter den konfigurierten Teilstämmen wurden keine Teams gefunden. Bitte die ' +
        'Teilstamm- und Team-Auswahl in der Konfiguration prüfen.',
    relationshipTypesUnreadable:
        'Die Beziehungsart „Elternteil/Kind" wurde in ChurchTools nicht gefunden. Ohne sie ' +
        'lassen sich Geschwister nicht erkennen, und die Beiträge wären zu hoch.',
    feesNotConfigured:
        'Für die Beitragsabrechnung sind noch keine Beitragssätze hinterlegt. Die Staffel ' +
        'wird unter Admin → Extensions festgelegt.',
    refresh: 'Aktualisieren',
    loadedAt: (time: string) => `Stand: ${time}`,
    buildInfo: (version: string, commit: string) => `RR Organigram v${version} (build ${commit})`,
    accessDenied: 'Du hast keinen Zugriff auf das RR Mitarbeiter-Dashboard.',
    partialErrorTitle:
        'Nicht alle Gruppen konnten geladen werden. Die rot markierten Summen sind deshalb ' +
        'nicht berechenbar — „Aktualisieren" versucht es erneut.',
    failedHauptstamm: (name: string) => `Hauptstamm „${name}“`,
    failedSammelgruppe: (name: string) => `Sammelgruppe „${name}“`,
    collectionsTitle: 'Leiter ohne Team',

    // --- Änderungsprotokoll (Dashboard) ---
    changelogTitle: 'Änderungen der letzten 30 Tage',
    changelogStand: (time: string) => `Stand: ${time}`,
    changelogStandNote: '· wird nur über die Konfiguration aktualisiert',
    changelogNever:
        'Das Änderungsprotokoll wurde noch nie abgerufen. Nur der Admin kann es unter ' +
        'Konfiguration → Änderungsprotokoll aktualisieren.',
    changelogEmpty: 'Keine Änderungen in den 30 Tagen vor diesem Stand.',
    changelogUnreadable: 'Das Änderungsprotokoll konnte nicht gelesen werden.',
    changelogKind: {
        added: 'hinzugefügt',
        removed: 'entfernt',
        role: 'Rolle geändert',
        status: 'Status geändert',
    } as const,
    /** ChurchTools' status values, in words; unknown ones verbatim. */
    changelogStatusLabel: (status: string) =>
        ({
            active: 'aktiv',
            to_delete: 'wird entfernt',
            requested: 'angefragt',
            waiting: 'Warteliste',
        })[status] ?? status,
    changelogRoleChange: (from: string, to: string) => `${from} → ${to}`,
    changelogStatusChange: (from: string, to: string) =>
        `Status ${COPY.changelogStatusLabel(from)} → ${COPY.changelogStatusLabel(to)}`,
    changelogBy: (name: string) => `durch ${name}`,
    changelogShowAll: (n: number) => `Alle ${n} Änderungen zeigen`,
    changelogShowFewer: 'Weniger zeigen',
    collectionEmpty: 'Niemand in dieser Gruppe.',
    collectionUnavailable: 'Die Gruppe konnte nicht gelesen werden.',
    collectionListLabel: (name: string) => `Mitglieder von ${name}`,
    openConfiguration: 'Konfiguration',
    openPersonInNewTab: (name: string) => `${name} – Profil in ChurchTools, öffnet neuen Tab`,
    memberFieldMissing: (name: string) =>
        `Das Mitgliederfeld „${name}“ gibt es in keiner der Gruppen. Die Zahlen dazu ` +
        `stehen deshalb auf 0 — bitte in der Konfiguration ein vorhandenes Feld wählen.`,
    failedTeilstamm: (name: string) => `Teilstamm „${name}“`,
    failedTeilstammTeams: (name: string) => `Teams von Teilstamm „${name}“`,
    failedTeam: (name: string, teilstamm: string) => `Team „${name}“ (Teilstamm „${teilstamm}“)`,
    // Organigram cards.
    levelHauptstamm: 'HAUPTSTAMM',
    levelTeilstamm: 'TEILSTAMM',
    levelCollection: 'SAMMELGRUPPE',
    collectionCompactCount: (n: number) => `${n} Leiter ohne Team`,
    levelTeams: 'TEAMS',
    noLeaders: 'Keine Leiter eingetragen.',
    noTeams: 'Keine Teams.',
    showAllTeams: (n: number) => `Alle ${n} Teams zeigen`,
    showFewerTeams: 'Weniger zeigen',
    teamsUnavailable: 'Teams konnten nicht geladen werden.',
    unknown: 'unbekannt',
    openGroup: (name: string) => `Zur ChurchTools-Gruppe von ${name} wechseln`,
    countsLine: (leaders: number | '?', participants: number | '?') =>
        `${leaders} Leiter · ${participants} Teilnehmer`,
    fieldLine: (count: number | '?', field: string) => `${count}× ${field}`,
    teilstammSummary: (leaders: string, teams: number) =>
        `${leaders || 'Keine Leiter eingetragen'} · ${teamCount(teams)}`,
    noHauptstamm: 'Keine Hauptstamm-Gruppe konfiguriert.',
    groupFallbackName: (id: number) => `Gruppe ${id}`,
    dashboardLoadError: 'Daten konnten nicht geladen werden.',
    // Hints below the organigram.
    hintsTitle: 'Hinweise',
    hintsNone: 'Keine Auffälligkeiten — niemand ist mehrfach zugewiesen oder ohne Team.',
    hintsNoneSoFar:
        'In den Gruppen, die geladen werden konnten, ist nichts aufgefallen. Die übrigen ' +
        'sind oben genannt und wurden nicht geprüft.',
    hintsRule:
        'Personen mit Leiter-Rolle in mindestens einem Team werden in der Gesamtzählung immer ' +
        'als Leiter gewertet — auch wenn sie in anderen Teams als Mitglied geführt sind. ' +
        'Dadurch wird niemand doppelt gezählt.',
    hintsLeadersInTeams: 'Teamleiter in mehreren Teams',
    hintsMembersInTeams: 'Teilnehmer in mehreren Teams',
    hintsMixed: 'Leiter in einem Team, Teilnehmer in einem anderen',
    hintsMixedLeader: (teams: string[]) => `Leiter: ${teams.join(', ')}`,
    hintsMixedParticipant: (teams: string[]) => `Teilnehmer: ${teams.join(', ')}`,
    hintsStaffWithoutTeam: 'Mitarbeiter ohne Team',
    hintsLeadershipWithoutTeam: 'Stammleitung ohne Team',
    hintsNotCounted: 'Nicht mitgezählt',
    jahresmeldungNotCountedWithheld:
        'Wer nicht mitgezählt wird, lässt sich erst sagen, wenn alle Teams gelesen werden ' +
        'konnten.',
    jahresmeldungNotCountedHint:
        'In keinem Team und mit einer Rolle, die nicht als Mitarbeiter gewählt ist – in ' +
        'keiner Zeile der Tabelle enthalten, wie im Organigramm. Gehören sie dazu, die Rolle ' +
        'in der Konfiguration anhaken oder sie einer Sammelgruppe zuordnen.',
    hintsNotCountedNote:
        'In keinem Team und mit einer Rolle, die nicht als Mitarbeiter gewählt ist. Gehören ' +
        'sie dazu, die Rolle in der Konfiguration unter „Wer ist Mitarbeiter?" anhaken oder ' +
        'sie einer Sammelgruppe zuordnen.',
    /** Read out in place of a "?" that stands for a sum missing a part. */
    notComputable: 'nicht berechenbar',
    loading: 'Lädt …',
    viewsNav: 'Ansichten',
    gateCheckFailed: (status?: number) =>
        status
            ? `Der Gate-Check konnte nicht durchgeführt werden (HTTP ${status}).`
            : 'Der Gate-Check konnte nicht durchgeführt werden.',
    requestTimedOut: (seconds: number) =>
        `ChurchTools hat nicht innerhalb von ${seconds} Sekunden geantwortet. Bitte später erneut laden.`,
    listTruncated: (url: string, max: number) =>
        `${url} liefert mehr als ${max} Einträge — die Liste wäre unvollständig.`,
    close: 'Schließen',
    // Leader lists are labelled with the group role's own name, straight from
    // ChurchTools — see `groupLeadersByRole` in dashboard/counts.ts. The labels
    // below are only for the stat tiles and the "?" error state.
    teamleiterStat: 'Teamleiter',
    leiterStat: 'Leiter',
    mitgliederStat: 'Teilnehmer',
    gesamtStat: 'Gesamt',
    /** Shown in place of a name when a leadership position is unfilled. */
    vacantRole: 'nicht besetzt',
    // Tabs (ADR-007).
    tabOrganigram: 'Organigramm',
    tabBeitraege: 'Beitragsabrechnung',
    beitraegeTitle: 'RR Beitragsabrechnung',
    teamCount,
    beitraegeLoadError: 'Die Beitragsdaten konnten nicht geladen werden.',
    beitraegeAggregatesOnly:
        'Diese Ansicht zeigt Summen; Namen nur in der aufklappbaren Liste der ' +
        'Beitragsfreien. Geburtsdaten und Adressen stehen nur in der Export-Datei.',
    feesExemptListTitle: 'Wer ist beitragsfrei?',
    feesExemptListShow: (n: number) => `${n} Personen anzeigen`,
    feesExemptListHide: 'Liste schließen',
    feesExemptListNone: 'Niemand ist beitragsfrei.',
    feesExemptReason: {
        juniorLeader: 'Juniorleiter – leiten selbst ein Team, unter 18',
        staff: 'Mitarbeiter – leiten selbst ein Team oder sind Mitarbeiter',
        ladder: 'Beitragsfrei laut Staffel – weiteres Kind derselben Familie',
    },
    feesExemptFamily: (key: string, size: number) => `Familie ${key} · ${size} RR-Kinder`,
    feesTotalLabel: 'Einzuziehender Gesamtbetrag',
    feesOrganigramTitle: 'Abgleich mit dem Organigramm',
    feesLeaders: 'Leiter',
    feesMembers: 'Mitglieder',
    feesReconciliation: (members: number, staffChildren: number, participants: number) =>
        `Dieselben Zahlen wie im Tab „Organigramm", aus denselben Daten nach denselben ` +
        `Regeln. Die Abrechnung zählt alle ${participants} Teilnehmer der Teams: ` +
        `${members} davon sind Kinder, wie im Organigramm, die übrigen ${staffChildren} ` +
        'leiten selbst ein Team oder sind Mitarbeiter. Im Organigramm stehen sie bei den ' +
        'Leitern, hier zahlen sie den Satz für Mitarbeiter bzw. Juniorleiter.',
    feesPeopleTitle: 'Teilnehmer',
    feesParticipantsExplained: (children: number, leaders: number) =>
        leaders === 0
            ? `Teilnehmer gesamt: alle, die in einem Team Teilnehmer sind – alle ${children} sind Kinder.`
            : `Teilnehmer gesamt: alle, die in einem Team Teilnehmer sind – ${children} Kinder ` +
              `und ${leaders}, die selbst Mitarbeiter sind, meist weil sie ein anderes Team leiten.`,
    feesParticipants: 'Teilnehmer gesamt',
    feesLiable: 'beitragspflichtig',
    feesExempt: 'beitragsfrei',
    feesExemptStaff: 'davon Mitarbeiter',
    feesExemptLadder: 'davon beitragsfreie Kinder',
    feesExemptJuniorLeader: 'davon Juniorleiter',
    feesFamiliesTitle: 'Familien',
    feesFamilies: 'Familien gesamt',
    feesFamiliesOnLastRung: (rungs: number) => `mit ${rungs}+ RR-Kindern`,
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
    jahresmeldungRollupHint:
        'Die drei rechten Spalten sind Summen für den eigenen Gebrauch und gehören nicht ' +
        'ins Bundesformular.',
    jahresmeldungRowTotal: 'Gesamt',
    jahresmeldungRowHead: 'Teilstamm',
    jahresmeldungOhneTeamRow: 'Mitarbeiter ohne Team',
    /**
     * The table's columns: heading lines as the Bund's form prints them, a
     * short heading for narrow screens, and what a screen reader announces.
     */
    jahresmeldungColumns: {
        jungen: { lines: ['Jungen'], short: 'Jungen', label: 'Jungen' },
        maedchen: { lines: ['Mädchen'], short: 'Mädchen', label: 'Mädchen' },
        juniorleiterM: {
            lines: ['Juniorleiter', 'männlich'],
            short: 'JL m',
            label: 'Juniorleiter männlich',
        },
        juniorleiterW: {
            lines: ['Juniorleiter', 'weiblich'],
            short: 'JL w',
            label: 'Juniorleiter weiblich',
        },
        mitarbeiterM: {
            lines: ['Mitarbeiter', 'männlich'],
            short: 'MA m',
            label: 'Mitarbeiter männlich',
        },
        mitarbeiterW: {
            lines: ['Mitarbeiter', 'weiblich'],
            short: 'MA w',
            label: 'Mitarbeiter weiblich',
        },
        ohneZuordnung: {
            lines: ['ohne', 'Zuordnung'],
            short: 'ohne Zuordnung',
            // Says out loud what the heavier border says visually.
            label: 'ohne Zuordnung, nicht Teil des Formulars',
        },
        sumTeilnehmer: {
            lines: ['Teilnehmer'],
            short: 'TN',
            label: 'Teilnehmer gesamt, nicht Teil des Formulars',
        },
        sumLeiter: {
            lines: ['Leiter'],
            short: 'L',
            label: 'Leiter gesamt einschließlich Juniorleiter, nicht Teil des Formulars',
        },
        sumGesamt: {
            lines: ['Gesamt'],
            short: 'Ges.',
            label: 'Personen gesamt in dieser Zeile, nicht Teil des Formulars',
        },
    },
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
                'Leiter ab 18 Jahren. Als Leitungsrolle gilt, was ChurchTools selbst als ' +
                'Leitung führt, dazu die Rollen, die unter Admin → Extensions zusätzlich ' +
                'angehakt sind.',
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
    // Configuration screen.
    adminFirstRun: 'Erstmaliges Setup',
    adminResume: 'Einrichtung fortsetzen',
    adminConfiguration: 'Konfiguration',
    adminLead:
        'Diese Extension kennt keinen Stamm. Alles, was sie über euren wissen muss, steht ' +
        'hier — damit derselbe Build bei jedem Royal-Rangers-Stamm läuft.',
    adminLoadError: 'Konfiguration konnte nicht geladen werden.',
    adminSectionStructure: 'Struktur',
    adminHauptstammLabel: 'Hauptstamm-Gruppe',
    adminHauptstammHelp:
        'Wähle die oberste Gruppe eures Stammes – die Gruppe, unter der eure Teilstämme ' +
        'hängen, oder bei einem Stamm ohne Teilstämme direkt eure Teams. Nur Mitglieder ' +
        'dieser Gruppe können das Dashboard öffnen.',
    adminSearchPlaceholder: 'Gruppe suchen (Name oder ID)…',
    adminNoGroupFound: 'Keine Gruppe gefunden.',
    adminGroupId: (id: number) => `ID ${id}`,
    adminTeilstaemmeLabel: 'Teilstämme',
    adminTeilstaemmeHelpWith: 'Mit Teilstämmen: Wähle die Gruppen eurer Teilstämme.',
    adminTeilstaemmeHelpWithout:
        'Ohne Teilstämme: Wähle die Hauptstamm-Gruppe von oben selbst aus.',
    adminHauptstammItself: (id: number) => `Hauptstamm · ID ${id}`,
    adminOnlyChildren: 'Nur Untergruppen des Hauptstamms anzeigen',
    adminNoChildren: 'Keine passenden Untergruppen — Haken entfernen, um alle Gruppen zu sehen.',
    adminOtherGroups: 'Weitere Gruppen',
    adminChildrenUnavailable:
        'Die Untergruppen des Hauptstamms konnten nicht gelesen werden — die Liste ist ' +
        'deshalb leer, nicht weil es keine gäbe. Bitte die Seite neu laden.',
    adminTeamsLabel: 'Welche Untergruppen sind eure Teams?',
    adminTeamsHelp:
        'Unter euren Teilstämmen hängen oft auch andere Gruppen, etwa Camps oder ' +
        'Leitungsrunden. Wähle die Art Gruppe, die eure Teams sind – neue Teams dieser Art ' +
        'zählen später automatisch mit.',
    adminShowGroups: 'Gruppen anzeigen',
    adminRolesInStamm: 'In Hauptstamm und Teilstämmen',
    adminRolesInTeams: 'In den Teams',
    adminReading: 'Wird gelesen …',
    adminNoSubgroups: 'Unter den gewählten Teilstämmen liegen keine Untergruppen.',
    adminGroupCount: (n: number) => `${n} Gruppen`,
    adminScanIncomplete:
        'Mindestens eine Gruppe konnte nicht gelesen werden. Die Zahlen unten sind deshalb ' +
        'Untergrenzen — eine 0 heißt hier nicht zwingend „niemand".',
    adminPreviewLead: 'Mit dieser Einstellung:',
    adminPreviewTeilstaemme: 'Teilstämme',
    adminPreviewTeams: 'Teams',
    adminPreviewPersons: 'Personen',
    adminSectionRules: 'Zählregeln',
    adminLeadersLabel: 'Wer ist Mitarbeiter?',
    adminLeadersHelp:
        'Jedes Teammitglied zählt entweder als Mitarbeiter oder als Kind. Hake die Rollen an, ' +
        'die bei euch Mitarbeiter sind – alle anderen zählen als Kinder. Das bestimmt die ' +
        'Zahlen im Organigramm, wer in der Beitragsabrechnung den Mitarbeiter-Satz zahlt, ' +
        'und die Jahresmeldung.',
    adminPersonCount: (n: number) => `${n} Personen`,
    adminLeadershipRole: (n: number) => `in ChurchTools als Leitung markiert · ${n} Personen`,
    adminNoRoles: 'Für die gewählten Gruppen sind keine Rollen bekannt.',
    adminSectionDisplay: 'Darstellung',
    adminVacancyLabel: 'Offene Positionen anzeigen',
    adminVacancyHelp:
        'Ist eine dieser Rollen in einem Teilstamm nicht besetzt, zeigt die Karte ' +
        '„nicht besetzt", statt die Rolle wegzulassen – so fällt eine fehlende Stammleitung auf.',
    adminMemberFieldLabel: 'Horizont-Kachel',
    adminMemberFieldHelp:
        'Die Kachel zeigt, wie viele Mitglieder bei diesem Feld einen Haken haben. Führt euer ' +
        'Stamm keine Horizont-Bestellung, wähle „Keine Horizont-Kachel".',
    adminMemberFieldNone: 'Keine Horizont-Kachel',
    adminMemberFieldNoScope: 'Die Felder werden angeboten, sobald Teilstämme gewählt sind.',
    adminMemberFieldMissing: (name: string) => `${name} (nicht mehr gefunden)`,
    adminSectionFees: 'Beiträge',
    adminFeesHelp:
        'Der Betrag in der letzten Zeile gilt für jedes weitere Kind derselben Familie. Ist bei ' +
        'euch ab dem 3. Kind kein Beitrag fällig, trag dort 0,00 € ein.',
    adminRung: (n: number) => `${n}. Kind`,
    adminRungFrom: (n: number) => `ab ${n}. Kind`,
    adminNoLadder: 'Noch keine Staffel — ohne sie bleibt die Beitragsabrechnung ungenutzt.',
    adminAddRung: '+ Weiteres Kind',
    adminRemoveRung: (label: string) => `Betrag für „${label}" entfernen`,
    adminRungRemoved: (label: string) => `Entfernt. Die letzte Zeile gilt jetzt ${label}.`,
    adminStaffFeesHeading: 'Eigene Sätze',
    adminStaffFee: 'Mitarbeiter',
    adminJuniorLeaderFee: 'Juniorleiter',
    adminJuniorLeaderNote: 'Leiter unter 18',
    adminSectionAccess: 'Zugriff',
    adminAccessLabel: 'Wer darf konfigurieren?',
    adminAccessHelp:
        'Nur wer in der Hauptstamm-Gruppe eine dieser Rollen hat, sieht den Link zur ' +
        'Konfiguration und kann sie öffnen. Ist keine davon mehr besetzt, kommt niemand mehr ' +
        'hinein – dann die Rolle in ChurchTools neu vergeben.',
    adminAccessNoneChosen: 'Bitte mindestens eine Rolle wählen, die konfigurieren darf.',
    adminAccessChecking: 'Deine Rolle in der Hauptstamm-Gruppe wird geprüft …',
    adminAccessUnverifiable:
        'Deine Rolle in der Hauptstamm-Gruppe konnte nicht geprüft werden. Bitte neu laden.',
    adminAccessWouldLockOut:
        'Du hast keine der gewählten Rollen in der Hauptstamm-Gruppe. Nach dem Speichern ' +
        'könntest du die Konfiguration nicht mehr öffnen – bitte deine eigene Rolle mit wählen.',
    adminCollectionsLabel: 'Sammelgruppen für Leiter ohne Team',
    adminCollectionsHelp:
        'Optional. Eine Gruppe für Leiter, die zum Stamm gehören, aber in keinem Team sind – ' +
        'z. B. ehemalige Leiter. Alle Mitglieder zählen als Mitarbeiter und erscheinen im ' +
        'Organigramm unter „Leiter ohne Team". Eine Gruppe ist entweder Teilstamm oder ' +
        'Sammelgruppe.',
    adminNoCollectionCandidates: 'Der Hauptstamm hat keine Untergruppen.',
    adminTakenOver:
        'Hier sind bereits Einstellungen aus einer früheren Einrichtung gespeichert. Bitte ' +
        'prüfe sie und ergänze, was fehlt.',
    adminSave: 'Speichern',
    adminSaving: 'Speichert …',
    adminSaved: 'Gespeichert.',
    adminSaveError: 'Unbekannter Fehler beim Speichern.',
    adminSaveIncomplete:
        'Hauptstamm, mindestens ein Teilstamm und mindestens ein Team-Gruppentyp sind nötig.',

    // --- Änderungsprotokoll (Admin) ---
    adminSectionChangelog: 'Änderungsprotokoll',
    adminChangelogHelp:
        'Das Dashboard zeigt Mitgliedschafts-Änderungen der letzten 30 Tage aus dem ' +
        'ChurchTools-Log. Nur hier wird es aktualisiert; das Dashboard liest den ' +
        'gespeicherten Stand.',
    adminChangelogRun: 'Änderungen jetzt abrufen',
    adminChangelogRunning: 'Wird abgerufen …',
    adminChangelogNever: 'Noch nicht abgerufen.',
    adminChangelogUnreadable:
        'Der gespeicherte Stand ist nicht lesbar — ein neuer Abruf ersetzt ihn.',
    adminChangelogStand: (time: string, entries: number, lines: number) =>
        `Stand: ${time} · ${entries} ${entries === 1 ? 'Eintrag' : 'Einträge'} aus ${lines} Zeilen`,
    adminChangelogUnparsed: (n: number) => `${n} ${n === 1 ? 'Zeile' : 'Zeilen'} nicht lesbar`,
    adminChangelogForbidden:
        'Das Log konnte nicht gelesen werden. Dafür braucht es in ChurchTools das Recht ' +
        '„Logfile ansehen“ (Churchcore).',
    adminChangelogNoModule: 'Die Konfiguration muss zuerst gespeichert werden.',
    adminChangelogError: 'Unbekannter Fehler beim Abrufen.',
} as const;
