# Design Spec 003: Änderungsprotokoll der letzten 30 Tage

- **Status:** accepted
- **Owner:** Solution Architect / UX Director
- **Date:** 2026-10-16
- **Related artifacts:**
  - Design Spec 002 (`002-konfigurierbarkeit.md`) — KV-Store, Admin-Oberfläche
  - ADR-005 API client, ADR-008 Declarative access rules,
    ADR-011 Personal data, ADR-013 Jahresmeldung personal data,
    ADR-014 Configuration over constants
  - `docs/PRD.md` US-2 (Admin-Konfiguration), US-5 (Fehlerzustände)

## Ziel

Wer die Zahlen auf dem Dashboard liest, fragt sich, warum sie sich geändert
haben: welche Kinder sind dazugekommen, welche sind gegangen, wer ist vom
Teilnehmer zum Leiter geworden — und in welchem Team. Das Dashboard bekommt
dafür einen Kasten „Änderungen der letzten 30 Tage“, der diese Ereignisse
aus dem ChurchTools-Log listet.

**Nicht-Ziele:**

- Keine Historie über 30 Tage hinaus, kein Archiv.
- Keine Änderungen an Personendaten (Adresse, Geburtstag, Mitgliederfelder),
  nur Gruppenmitgliedschaften.
- Keine Gruppen außerhalb des Dashboards: Camps, Hajks und Veranstaltungen
  tauchen nicht auf, auch wenn sie unter demselben Stamm hängen.
- Kein Einstellen des Zeitfensters. 30 Tage sind fest.

## Entschiedene Fragen

Aus der Brainstorming-Sitzung vom 2026-10-16, in der Reihenfolge, in der sie
fielen:

1. **Die Quelle ist das ChurchTools-Log, nicht ein Vergleich zweier
   Dashboard-Ladungen.** Ein Schnappschuss-Vergleich sieht nur, was zwischen
   zwei Öffnungen passiert ist, und datiert eine Entfernung auf den Tag, an
   dem sie auffiel. Das wurde als nicht deterministisch verworfen. Das Log
   liefert für jede Mitgliedschaft Zeitpunkt, Gruppe, Person, Rolle und wer
   die Änderung gemacht hat.
2. **Das Log liest nur der Admin, auf Knopfdruck.** Das Recht „Logfile
   ansehen“ (`churchcore → view logfile`) gibt Einsicht in das Log der ganzen
   Gemeinde — Mails, Logins, Personendaten auch außerhalb der Royal Rangers.
   Es wird nicht an Dashboard-Nutzer verteilt. Der Admin hat es ohnehin.
3. **Was der Admin abruft, landet bereinigt im KV-Store.** Die Extension
   speichert nur die Felder, die das Dashboard zeigt (siehe Datenmodell).
   Kommentare und alles Übrige aus der Log-Zeile werden nicht gespeichert.
4. **Das Dashboard liest nur den Cache.** Es macht keinen Log-Aufruf, prüft
   kein Recht und zeigt immer, von wann sein Stand ist und dass nur der Admin
   ihn aktualisiert. Nie abgerufen ist ein eigener Zustand mit eigenem Text,
   keine leere Liste.
5. **Jeder Abruf ersetzt den Cache vollständig.** Kein Cursor, kein
   Zusammenführen: 30 Tage lesen, filtern, schreiben. Ein halb gescheiterter
   Abruf schreibt nichts. Elf Requests plus eine Handvoll hinter einem Knopf
   sind in Ordnung.
6. **Gezeigt werden nur Gruppen, die das Dashboard zählt**: Hauptstamm,
   Teilstämme, deren Teams (Kinder vom konfigurierten Team-Typ) und
   Sammelgruppen.
7. **Rollenwechsel zählen mit**, weil sie die Mitarbeiterzahl bewegen.
   Statuswechsel ebenso (`active → to_delete` nimmt jemanden aus der
   Zählung, ohne dass die Mitgliedschaft gelöscht wäre).
8. **Entfernte Personen stehen mit Namen da.** Sie waren vorher auf dem
   Dashboard sichtbar; ein Protokoll, das „jemand“ sagt, erklärt nichts.
9. **Links zum Profil nur, wo ADR-013 sie erlaubt**: ChurchTools' eigene
   `frontendUrl`, nie ein selbstgebauter Pfad. Das Log liefert sie für die
   betroffene Person nicht. Das Dashboard kennt sie aber für jeden, der noch
   Mitglied ist — über den geladenen Baum (`profileLinks(root)`), per
   Personen-ID. Wer entfernt wurde, steht ohne Link da.

Nach dem Builder-Check am selben Tag, drei Entscheidungen des Autors:

10. **`geändert`-Zeilen bekommen ihre Personen-ID beim Abruf aufgelöst.**
    Die Zeile trägt keine `Person:`, aber die Mitgliedschafts-ID in
    `Gruppenmitgliedschaft[<id>]`, und jede Zeile von
    `/groups/{id}/members` trägt dieselbe ID als `id` (Live-Instanz,
    verifiziert). Der Abruf liest für jede Gruppe, die eine solche Zeile
    hat, einmal die Mitglieder — **alle Status, nicht nur `active`**, sonst
    fehlt gerade die Person, deren Status eben auf `to_delete` ging — und
    bildet Mitgliedschafts-ID → Personen-ID. Eine Mitgliedschaft, die
    inzwischen gelöscht ist, löst nicht auf; dann bleibt `personId` null und
    der Name steht ohne Link. Ohne das wäre genau der Fall aus dem Ziel —
    „wer ist vom Teilnehmer zum Leiter geworden“ — nie verlinkt.
11. **Zeilen automatischer Gruppen bleiben drin, unverändert.** Auf der
    Live-Instanz sind die Teilstämme dynamische Gruppen, die ChurchTools aus
    den Teams füllt; eine Aufnahme ins Team erzeugt tags darauf eine zweite
    Zeile im Teilstamm mit `personName: "ChurchTools"`. Diese Zeilen sind
    wahr, und die Spalte „durch“ erklärt sie. Eine Regel, die sie
    zusammenfaltet, bräuchte entweder den Namen der Automation (ein
    installationsspezifischer String — verboten) oder die Elternrelation
    im Cache plus eine Tagesgleichheit, die bei Mitternachtsläufen danebengreift.
    Nicht gebaut, bis die Liste jemandem zu lang ist.
12. **Eine `geändert`-Zeile mit `Rolle` und `Status` ergibt zwei Einträge**,
    einen je Art. Der Listen-Schlüssel ist deshalb `logId` + `kind`, nicht
    `logId` allein.

## Datenquelle: `GET /api/logs`

Recon gegen die Live-Instanz am 2026-10-16, mit dem Token aus `.env.live`,
nur lesend.

| Befund | Konsequenz |
|---|---|
| `limit` ist auf 100 gedeckelt | 30 Tage sind ~11 Seiten; `fetchAllPages(url, 100)` reicht |
| `after=<ISO>` wird beachtet | das Zeitfenster filtert der Server |
| `message=<Text>` ist ein Teilstring-Filter (`%` als Wildcard) | `message=Gruppenmitgliedschaft` reduziert 46.000 Zeilen auf ~1.000 |
| `domain_type`, `category`, `level`, `domain_id` werden ignoriert | keine Filterung nach Typ; der Client filtert nach Gruppe |
| ohne „Logfile ansehen“ antwortet der Server mit 403 | der Admin-Knopf zeigt das als Fehler mit Nennung des Rechts |

Der `message`-Filter ist in der OpenAPI-Beschreibung nicht dokumentiert.
Er ist die eine Stelle, an der ein ChurchTools-Update dieses Feature still
leer laufen lassen könnte — dann meldet der Abruf „0 Einträge“, und die
Admin-Anzeige nennt die Zahl der gelesenen Zeilen, damit das auffällt.

Jeder Eintrag trägt `id`, `date` (ISO, UTC), `domainType`, `domainId`
(Mitgliedschafts-ID), `personName` (**wer die Änderung gemacht hat**) und
`message`. Die vier Formen der Nachricht:

```
Gruppenmitgliedschaft[38872] "RR Kundschafterteam Eisbären|Tyler Wittek" erstellt — Gruppe: 2156, Person: 43450, Rolle: Teilnehmer, Status: active, Gruppeneintrittsdatum: 2026-10-16 00:00:00
Gruppenmitgliedschaft[33132] "RR Teilnehmer|Leah Brose" gelöscht — Gruppe: 2646, Person: 37483, Rolle: Teilnehmer, Status: active, Gruppeneintrittsdatum: 2022-09-18 00:00:00, Kommentar: ''
Gruppenmitgliedschaft[19821] "RR Pfadfinderteam Schneefüchse|Lotte Merkle" geändert — Status: active → to_delete
Gruppenmitgliedschaft[19821] "RR Pfadfinderteam Schneefüchse|Lotte Merkle" geändert — Rolle: Teilnehmer → Leiter, roleChangedDate: 2020-09-29 00:00:00 → 2026-09-24 17:27:30
Gruppenmitgliedschaft[33132] "RR Teilnehmer|Leah Brose" unverändert
```

- `erstellt` und `gelöscht` tragen die Gruppen-ID hinter `Gruppe:`.
- `geändert` trägt **keine** Gruppen-ID, nur den Gruppentitel vor dem `|`.
  Die Attribute hinter dem `—` sind kommagetrennt `Name: alt → neu`;
  interessant sind nur `Rolle` und `Status`. Die übrigen (`Kommentar`,
  `roleChangedDate`, `Gruppeneintrittsdatum`, `memberStartDate`,
  `statusChangedDate`) werden ignoriert; eine Zeile, die nur solche trägt,
  ergibt keinen Eintrag.
- `unverändert` steht neben jeder Löschung und wird ignoriert.
- Zeilen, deren `domainType` nicht `group_membership` ist, werden ignoriert
  (der Teilstring-Filter liefert auch Rechte-Änderungen, die das Wort
  enthalten).
- Rollennamen kommen so, wie die Installation sie führt — auch `participant`
  und `leader` tauchen auf. Sie werden unverändert gezeigt, nicht übersetzt.

## Filter: Welche Gruppen das Dashboard zählt

Der Abruf braucht die Menge der Gruppen mit ID **und Titel**, weil `geändert`
nur den Titel kennt:

- Hauptstamm (`settings.gateGroupId`), Teilstämme (`settings.teilstammIds`),
  Sammelgruppen (`settings.collectionGroupIds`): IDs aus den **gespeicherten**
  Settings, Titel per `getGroup(id)`.
- Teams: `getChildGroups(teilstammId)` → `teamsAmong(children,
  settings.teamGroupTypeIds)`, wie `loadOrganigram` sie findet.

Zuordnung: zuerst über `Gruppe: <id>` wenn vorhanden, sonst über den Titel
vor dem `|`, exakt (`title === groupName`). Ein Titel mit `|` darin wäre
nicht eindeutig; das ist der Preis dafür, dass `geändert` keine ID trägt,
und wird nicht behandelt.

Der Abruf nutzt die **gespeicherten** Settings, nicht den Entwurf des
Formulars: Das Protokoll soll dasselbe beschreiben, was das Dashboard zeigt.

Reihenfolge des Abrufs: Gruppenmenge bilden → Log-Zeilen lesen → Zeilen
zuordnen → für Gruppen mit `geändert`-Zeilen die Mitglieder lesen und
Personen-IDs auflösen → `ChangeLog` bauen → schreiben. Schlägt ein Schritt
fehl, wird nicht geschrieben.

## Datenmodell

Eine zweite Kategorie im bestehenden Custom Module, Shorty `changelog`,
Name „Änderungsprotokoll“. **Das `data`-Feld einer Kategorie fasst höchstens
2 000 Zeichen** (Validierungsfehler der Live-Instanz beim ersten Abruf,
2026-10-16). Deshalb trägt `data` nur den Kopf — `ChangeLog` ohne `entries` —
und die Einträge liegen in den **Werte-Zeilen** der Kategorie
(`…/customdatacategories/{id}/customdatavalues`, je Zeile bis 10 000 Zeichen,
auf rr-demo gemessen). Jede Zeile ist ein JSON-Chunk `{ syncedAt, entries }`
mit dem Stempel des Abrufs, zu dem sie gehört. Der Leser nimmt nur Zeilen
mit dem Stempel des Kopfes; Reihenfolge beim Schreiben: Chunks → Kopf →
alte Zeilen löschen. Bricht ein Abruf vorher ab, bleibt der alte Stand
vollständig lesbar, und die neuen Zeilen werden beim nächsten Erfolg
weggeräumt. Das Modell in JSON:

```ts
type ChangeLog = {
    /** Zeitpunkt des Abrufs, ISO. */
    syncedAt: string;
    /** Anfang des gelesenen Fensters, ISO — syncedAt minus 30 Tage. */
    since: string;
    /** Wie viele Log-Zeilen gelesen wurden, vor dem Filter. Sichtbar im Admin. */
    linesRead: number;
    /** Wie viele Zeilen im Fenster unlesbar waren (Form unbekannt). */
    linesUnparsed: number;
    entries: ChangeEntry[];
};

type ChangeEntry = {
    /** Log-ID. Mit `kind` zusammen eindeutig — eine Zeile kann zwei Einträge ergeben. */
    logId: number;
    /** Zeitpunkt der Änderung, ISO. */
    at: string;
    kind: 'added' | 'removed' | 'role' | 'status';
    personName: string;
    /**
     * Aus `Person: <id>`, oder bei `geändert` über die Mitgliedschafts-ID
     * aufgelöst (Entscheidung 10). Null, wenn beides fehlschlägt.
     */
    personId: number | null;
    groupId: number;
    groupName: string;
    /** Bei added/removed: die Rolle. Bei role: die neue Rolle. */
    role?: string;
    /** Bei role/status: der alte Wert. */
    from?: string;
    /** Bei status: der neue Status. Bei added: der Status, falls nicht active. */
    to?: string;
    /** Wer die Änderung gemacht hat — `personName` des Log-Eintrags. */
    actor: string;
};
```

Lesen wie `parseSettings`: defensiv, Feld für Feld, Unlesbares wird
weggelassen, nichts wird erfunden. Eine Kategorie ohne lesbares `data` ist
der Zustand „Protokoll unlesbar“, nicht „keine Änderungen“.

Größe: ~360 RR-Zeilen in 30 Tagen auf der Live-Instanz, nach dem Filter
deutlich weniger, ~200 Zeichen je Eintrag — also ~50 Einträge je
Werte-Zeile und eine Handvoll Zeilen je Abruf. Die erste Fassung dieses
Dokuments hielt das `data`-Feld für groß genug; das war nicht gemessen und
war falsch.

## Admin-Oberfläche

Ein neuer Abschnitt **„Änderungsprotokoll“** am Ende des Admin-Bildschirms,
**außerhalb** des Settings-Formulars — er speichert nichts an den Settings
und ist eine eigene Aktion. Sichtbar nur, wenn die gespeicherten Settings
einen Hauptstamm haben; vorher gibt es nichts abzurufen.

```
┌─ ÄNDERUNGSPROTOKOLL ─────────────────────────────────────────┐
│ Das Dashboard zeigt Mitgliedschafts-Änderungen der letzten   │
│ 30 Tage aus dem ChurchTools-Log. Nur hier wird es            │
│ aktualisiert; das Dashboard liest den gespeicherten Stand.   │
│                                                              │
│ [ Änderungen jetzt abrufen ]  Stand: 14.10.2026 18:32 ·      │
│                               47 Einträge aus 1.063 Zeilen   │
└──────────────────────────────────────────────────────────────┘
```

Zustände der Statuszeile:

- noch nie abgerufen: „Noch nicht abgerufen.“
- läuft: Knopf deaktiviert, Beschriftung „Wird abgerufen …“
- fertig: „Stand: <Datum Uhrzeit> · <n> Einträge aus <m> Zeilen“, dazu
  „<k> Zeilen nicht lesbar“, wenn k > 0.
- 403 vom Log: „Das Log konnte nicht gelesen werden. Dafür braucht es in
  ChurchTools das Recht „Logfile ansehen“ (Churchcore).“ Der Cache bleibt,
  wie er war.
- anderer Fehler (Log, Gruppen, KV-Schreiben): die Fehlermeldung, Cache
  unverändert.

Die Statuszeile zeigt beim Öffnen den gespeicherten Stand, damit der Admin
weiß, ob ein Abruf nötig ist.

## Dashboard

Ein Abschnitt **„Änderungen der letzten 30 Tage“** unter dem
Hinweise-Panel (`DuplicatesPanel`), gleicher Rahmen und Titelstil. Er wird
unabhängig vom Organigramm geladen: ein KV-Read, der das Organigramm nicht
aufhält und von ihm nicht aufgehalten wird.

```
ÄNDERUNGEN DER LETZTEN 30 TAGE
Stand: 14.10.2026 18:32 · Aktualisierung nur durch den Admin

16.10.  + Tyler Wittek        Kundschafterteam Eisbären   Teilnehmer     durch Ulrike Singer
14.10.  – Leah Brose          RR Teilnehmer               Teilnehmer     durch Julia Timmalog
13.10.  ~ Lotte Merkle        Pfadfinderteam Schneefüchse Status aktiv → wird entfernt
24.09.  ~ Max Muster          Forscherteam Kaninchen      Teilnehmer → Leiter
```

- Neueste zuerst. Datum als `TT.MM.`; die Uhrzeit nicht.
- Zeichen vor dem Namen: `+` hinzugefügt, `–` entfernt, `~` geändert. Dazu
  ein `aria-label`, das es ausschreibt.
- Name als `PersonLink`, wenn `profileLinks(root)` die Person kennt, sonst
  Text. Das Panel bekommt dafür den `root`, sobald er geladen ist; vorher
  stehen die Namen als Text.
- Rolle bzw. Wechsel verbatim aus dem Log. Statuswerte werden übersetzt,
  weil `to_delete` niemandem etwas sagt: `active` → „aktiv“, `to_delete` →
  „wird entfernt“, `requested` → „angefragt“, `waiting` → „Warteliste“,
  unbekannte Werte verbatim.
- „durch <Name>“ am Zeilenende, in Sekundärfarbe.
- Die „Stand“-Zeile steht **immer** über der Liste, auch wenn die Liste
  lang ist, und wird nie weggeklappt: Ein alter Stand, der vollständig
  aussieht, ist die teure Fehlanzeige dieses Features.

Zustände:

| Zustand | Anzeige |
|---|---|
| Kategorie fehlt | nur Hinweis: „Das Änderungsprotokoll wurde noch nie abgerufen. Nur der Admin kann es unter Konfiguration → Änderungsprotokoll aktualisieren.“ |
| Kategorie da, `entries` leer | Stand-Zeile, darunter „Keine Änderungen in den 30 Tagen vor diesem Stand.“ |
| `data` unlesbar / KV-Read fehlgeschlagen | „Das Änderungsprotokoll konnte nicht gelesen werden.“ — kein Stand, keine Liste |
| Organigramm lädt noch | Liste mit Namen als Text; Links kommen mit dem Baum |

Mobil: eine Zeile je Eintrag wird zu zwei — Datum, Zeichen und Name oben,
Gruppe und Rolle darunter, „durch …“ bleibt bei der zweiten Zeile.

## Auswirkung je Tab

Nur das Dashboard und der Admin-Bildschirm. Jahresmeldung und Beiträge
bleiben unberührt.

## Code, der entsteht

- `src/shared/changelog.ts` — Typen, `parseChangeLog` (KV → `ChangeLog`,
  defensiv), `WINDOW_DAYS = 30`, Kategorie-Shorty.
- `src/admin/changelog.api.ts` — `fetchMembershipLogLines(since)` über
  `fetchAllPages`; `parseLogLine(entry)` → ein Zwischenergebnis mit Verb,
  Gruppen-ID/-Titel, Person, Attributen; `buildChangeLog(lines, groups,
  now)` → `ChangeLog`. Rein, testbar ohne Netz.
- `src/admin/useChangelogSync.ts` — Knopfzustand, Gruppenmenge aus
  gespeicherten Settings, Abruf, `writeCategory`.
- `src/admin/Admin.vue` — der neue Abschnitt.
- `src/dashboard/ChangelogPanel.vue` + `useChangelog.ts` — KV-Read, Zustände,
  Liste.
- `src/shared/copy.ts` — alle Texte.

Keine neue Abhängigkeit. Keine neue Einstellung in `Settings`.

## Teststrategie

- `parseLogLine` gegen die fünf Formen oben, mit anonymisierten echten
  Zeilen, inklusive: `geändert` mit Rolle **und** Status in einer Zeile,
  `geändert` nur mit Kommentar (→ kein Eintrag), Rollennamen `participant`/
  `leader`, ein Gruppentitel mit Umlauten und Ziffern, ein `domainType`
  ≠ `group_membership` (→ ignoriert).
- `buildChangeLog`: Zuordnung per ID und per Titel; Zeile außerhalb der
  Gruppenmenge fällt weg; `linesRead` und `linesUnparsed` stimmen;
  Reihenfolge neueste zuerst.
- `parseChangeLog`: leeres Objekt, fehlende Felder, kaputter Eintrag
  zwischen guten.
- `useChangelogSync`: 403 lässt den Cache unberührt und nennt das Recht;
  ein Fehler beim Gruppen-Lesen schreibt nichts.
- `useChangelog` (das Dashboard liest keine Komponenten in Tests, ADR-009):
  die vier Zustände aus der Tabelle als Zustandswerte; Stand-Zeile ist in
  jedem Zustand mit Liste Teil des Zustands.
- `parseLogLine` zusätzlich: eine `geändert`-Zeile mit `Rolle` und `Status`
  ergibt zwei Einträge mit derselben `logId`; die Auflösung
  Mitgliedschafts-ID → Personen-ID greift, und bleibt null, wenn die
  Mitgliedschaft nicht mehr existiert.

## Risiken

- **Undokumentierter `message`-Filter.** Fällt er weg, liest der Abruf das
  ganze Fenster ohne Filter — 460 Seiten, `fetchAllPages` bricht bei 100
  Seiten mit Fehler ab. Der Admin sieht einen Fehler, kein leeres Protokoll.
  Das ist das gewollte Verhalten.
- **Deutsche Log-Texte.** Eine Installation mit anderer Sprache schreibt
  vermutlich andere Verben. Dann sind alle Zeilen „nicht lesbar“, und die
  Admin-Anzeige sagt das in Zahlen. Nicht behandelt, weil nicht beobachtet.
- **Der Admin drückt nicht.** Das Protokoll veraltet. Die Stand-Zeile ist
  die einzige Abwehr. Eine Warnung ab n Tagen wird erst gebaut, wenn das
  tatsächlich jemanden trifft.
- **Zwei Admins drücken gleichzeitig.** Beide schreiben denselben Inhalt;
  der letzte gewinnt. Harmlos.

## Offene Punkte

- Ob das Log auf anderen Installationen dieselben Verben schreibt, weiß nur
  ein zweiter Stamm. Bis dahin ist der Parser für die Live-Instanz gebaut
  und sagt, wenn er nichts versteht.

## Verifikation auf der Demo-Instanz

1. Release auf `rr-demo` deployen (geschieht mit dem Release automatisch).
2. Als Admin: Konfiguration öffnen, „Änderungen jetzt abrufen“ drücken,
   Stand-Zeile prüfen.
3. In ChurchTools eine Person in ein Team aufnehmen, eine entfernen, eine
   Rolle ändern; erneut abrufen; die drei Zeilen stehen im Dashboard mit
   dem richtigen Team und dem richtigen Verursacher.
4. Als Nutzer ohne „Logfile ansehen“: das Dashboard zeigt dieselbe Liste
   mit derselben Stand-Zeile.
5. Mit einem Nutzer ohne „Logfile ansehen“ den Admin-Abruf versuchen: die
   Fehlermeldung nennt das Recht, der alte Stand bleibt.

## Change log

- 2026-10-16: Erstfassung nach Brainstorming.
- 2026-10-16: Builder-Check — Entscheidungen 10–12 (Personen-ID für
  `geändert`, automatische Gruppen verbatim, zwei Einträge je Zeile).
- 2026-10-16: Speicherung in Werte-Zeilen statt im `data`-Feld, nach dem
  2 000-Zeichen-Fehler auf der Live-Instanz (v1.17.1).
