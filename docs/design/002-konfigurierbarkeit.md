# Design Spec 002: Konfigurierbarkeit für fremde Stämme

- **Status:** accepted
- **Owner:** Solution Architect / UX Director
- **Date:** 2026-10-09
- **Related artifacts:**
  - Design Spec 001 (`001-jahresmeldung.md`)
  - ADR-004 Module structure, ADR-008 Declarative access rules,
    ADR-011 Personal data, ADR-013 Jahresmeldung personal data
  - PRD `docs/PRD.md` US-2 (Admin wählt Hauptstamm-Gruppe)

## Ziel

Ein fremder Royal-Rangers-Stamm installiert den ZIP, konfiguriert im Admin
seine Struktur und seine Zählregeln und bekommt dasselbe Dashboard — ohne dass
jemand Code anfasst. Heute scheitert das an fünf hartkodierten Annahmen, die
alle vom Stamm der Autoren handeln.

**Nicht-Ziel:** Mehrmandantenfähigkeit. Eine Installation bedient einen Stamm,
wie heute.

## Was heute hartkodiert ist

| Ort | Annahme | Folge für einen fremden Stamm |
|---|---|---|
| `hierarchy.ts`, `rr.api.ts`, `jahresmeldung.api.ts` | `groupTypeId === 1` ist ein Team | Teams unter einem eigenen Gruppentyp werden nicht gefunden — leeres Dashboard, keine Fehlermeldung |
| `constants.ts` `LEADER_ROLE_NAMES` | Leiter heißen Leiter, Co-Leiter, Mitarbeiter, Teamhelfer, Organisator | andere Rollenbezeichnungen zählen still falsch, bis in die Jahresmeldung |
| `constants.ts` `ALWAYS_SHOWN_LEADER_ROLES` | unbesetzt sichtbar sind Stammleiter, Stammwart | fremde Rollenbezeichnungen verschwinden |
| `counts.ts` `horizontCountFromMembers` | Mitgliederfeld heißt „Horizont" | Kachel bleibt leer |
| `types.ts` `DEFAULT_FEE_CONFIG` | 80 € / 60 € / ab dem dritten frei | falsche Rechnung |
| Admin | Teilstämme sind Children des Hauptstamms | ein Stamm ohne zweite Ebene kann nichts auswählen |

## Entschiedene Fragen

Aus der Brainstorming-Sitzung vom 2026-10-09, in der Reihenfolge, in der sie
fielen:

1. **Umfang:** alles Installationsspezifische, in einem Zug.
2. **Struktur bleibt dreistufig** — Stamm → Teilstämme → Teams. Ein kleiner
   Stamm trägt dieselbe Gruppe als Hauptstamm *und* als einzigen Teilstamm
   ein; es gibt keinen Sonderfall im Datenmodell.
3. **Teilstamm-Auswahl löst sich von der Eltern-Kind-Beziehung**, Teams nicht.
4. **Keine Rollenprüfung mehr für die Sichtbarkeit von Tabs.** Wer die
   Extension öffnen darf, regelt der ChurchTools-Admin über das `view`-Recht
   des Custom Module (`permissions.global → rr-dashboard.view`, gegen die
   Live-Instanz verifiziert). Die Extension baut das nicht nach.
5. **Das Zugangstor bleibt**: Mitgliedschaft in der konfigurierten
   Hauptstamm-Gruppe. Die Gruppe ist ohnehin Datenwurzel, die Prüfung kostet
   einen Request und hält eine zweite Schicht, falls das CT-Recht nur den
   Menüeintrag ausblendet statt die Dateien zu sperren.
6. **Beitragsstaffel ist eine Liste, die letzte Position gilt für alle
   weiteren.** Dazu eigene Sätze für Mitarbeiter und Juniorleiter.
7. **Wer einen eigenen Satz hat, belegt keine Geschwisterposition** — wie
   heute für Mitarbeiter.
8. **Keine stammspezifischen Defaults im Code.** Fehlende Konfiguration ist
   ein Zustand mit eigener Anzeige, kein Lückenfüller.

## Datenmodell

```ts
/** Beitragssätze, in Cent, damit die Arithmetik exakt bleibt. */
export type FeeConfig = {
    /**
     * Beitrag je Geschwisterposition. Der letzte Eintrag gilt für alle
     * weiteren Kinder, womit "ab dem dritten frei" genau [x, y, 0] ist und
     * kein Sonderfall für große Familien nötig wird.
     */
    childCents: number[];
    staffCents: number;
    juniorLeaderCents: number;
};

export type Settings = {
    // Struktur
    gateGroupId: number;
    teilstammIds: number[];
    /** Filtert die Auswahllisten für Hauptstamm und Teilstämme. */
    stammGroupTypeIds: number[];
    /** Welche Kindgruppen eines Teilstamms Teams sind. */
    teamGroupTypeIds: number[];

    // Zählregeln
    /**
     * Rollen, die zusätzlich als Leiter zählen, über das hinaus was
     * ChurchTools selbst als `type: 'leader'` führt. Leer ist gültig.
     */
    extraLeaderRoleIds: number[];
    /** Positionen, die auf einer Teilstamm-Karte unbesetzt sichtbar bleiben. */
    alwaysShownRoleIds: number[];
    /** Mitgliederfeld der Horizont-Kachel. Leer = Kachel entfällt. */
    horizontFieldName: string;

    // Beiträge
    fees: FeeConfig;
};
```

`beitraegeRoleIds` entfällt ersatzlos. Damit schrumpft `AccessRule` auf die
Variante `membership`, und `roleRule` verschwindet aus
`shared/access/rules.ts`.

### Pflicht, optional, und was Leere bedeutet

| Feld | fehlt → |
|---|---|
| `gateGroupId`, `teilstammIds`, `teamGroupTypeIds` | **Pflicht.** Alle Tabs zeigen den Konfigurationshinweis statt Zahlen |
| `fees.childCents` leer | Beitragsabrechnung zeigt den Hinweis; die anderen Tabs laufen |
| `extraLeaderRoleIds` leer | nur `type: 'leader'` zählt als Leiter — eine gültige Regel, kein Platzhalter |
| `alwaysShownRoleIds` leer | keine unbesetzten Positionen auf den Karten |
| `horizontFieldName` leer | Kachel entfällt |
| `fees.staffCents`, `juniorLeaderCents` | 0 — die neutrale Null, keine Annahme über den Stamm |

Eine unvollständige Konfiguration rendert **nie eine Tabelle voller Nullen**.
Das ist die Eigenschaft, um die es bei dieser Umstellung im Kern geht: der
heutige Fehlerfall ist ein leeres Dashboard, das wie ein leerer Stamm aussieht.

## Zugriff

```ts
export type AccessRule = { kind: 'membership'; groupId: number; requireActive?: boolean };
```

Ein Tor für die ganze Extension. Alle drei Tabs sind für jeden sichtbar, der
durchkommt. Begründung und Folgen stehen in der zugehörigen ADR; die
Beitragsabrechnung öffnet sich damit von drei auf vierzehn Personen auf der
Live-Instanz.

## Admin-Oberfläche

```
┌─ RR Dashboard — Konfiguration ───────────────────────────────────────────────┐
│  STRUKTUR                                                                    │
│                                                                              │
│  Hauptstamm-Gruppe                                                           │
│  [ RR Gesamt-Stammleitung                                      ID 950  ✕ ]   │
│  🔍 Gruppe suchen (Name oder ID)…                                            │
│  Zugangstor, Hero-Karte, und eine der beiden Quellen für „Mitarbeiter        │
│  ohne Team".                                                                 │
│                                                                              │
│  Teilstämme                              ☑ Nur Untergruppen anzeigen         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Untergruppen von „RR Gesamt-Stammleitung"                              │  │
│  │ ☑ RR Entdeckerstamm-MA                                        ID 1012  │  │
│  │ ☐ RR Wegbereiterstamm-MA                                      ID 2774  │  │
│  │ … Weitere Gruppen vom Typ „RR Dienst" (wenn Haken entfernt)            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Welche Gruppen sind Teams?                                                  │
│  Unter den gewählten Teilstämmen gefunden:                                   │
│  ☑ Kleingruppe          25 Gruppen                                           │
│  ☐ RR Veranstaltung      6 Gruppen                                           │
│                                                                              │
│  ⟳ Mit dieser Einstellung: 5 Teilstämme · 25 Teams · 366 Personen            │
│                                                                              │
│  ZÄHLREGELN                                                                  │
│  Wer zählt als Leiter?                                                       │
│  ☑ Leiter            immer — von ChurchTools als Leitung geführt             │
│  ☑ Mitarbeiter       78 Personen                                             │
│  ☐ Coach              0 Personen                                             │
│                                                                              │
│  Unbesetzte Positionen sichtbar lassen                                       │
│  ☑ Stammleiter   ☑ Stammwart   ☐ Stammhelfer                                 │
│                                                                              │
│  Mitgliederfeld für die Horizont-Kachel                                      │
│  [ Horizont                            ]  Gefunden: Horizont, Trikotgröße    │
│                                                                              │
│  BEITRÄGE                                                                    │
│  1. Kind     [  80,00 € ]                                                    │
│  2. Kind     [  60,00 € ]                                                    │
│  ab 3. Kind  [   0,00 € ]   ← letzte Zeile gilt für alle weiteren            │
│              [ + Weitere Position ]  [ ✕ letzte entfernen ]                  │
│  Mitarbeiter [   0,00 € ]     Juniorleiter [   0,00 € ]  (Leiter unter 18)   │
│                                                  [ Speichern ]               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Jeder Vorschlag kommt aus der Instanz, keiner aus dem Code.** Der Gruppentyp
für die Teilstamm-Liste wird vom gewählten Hauptstamm übernommen. Welche Typen
Teams sind, liest die Oberfläche unter den gewählten Teilstämmen aus und zeigt
Anzahlen. Jede Rolle zeigt, wie viele Personen sie heute halten — das
beantwortet „was soll ich anhaken" ohne Vorwissen über den Stamm.

**Die Vorschauzeile** rechnet nach jeder Änderung nach. Eine Fehlkonfiguration
zeigt dort eine 0, bevor sie im Dashboard als leere Seite erscheint.

## Auswirkung je Tab

**Organigramm.** `hierarchy.ts` filtert Teams nach `teamGroupTypeIds` statt
`=== 1`; die Teilstämme kommen aus der Konfiguration statt aus den Children.
Die Teilstamm-Karte zeigt unbesetzte Positionen nach `alwaysShownRoleIds`. Die
Horizont-Kachel entfällt bei leerem Feldnamen. Fallen Hauptstamm und einziger
Teilstamm zusammen, rendert nur die Hero-Karte — sonst stünde dieselbe Gruppe
zweimal untereinander.

**Beitragsabrechnung.** `fee-tiers.ts` bekommt die Staffel als Liste. Neu ist
der Juniorleiter-Satz, wofür die Altersregel aus der Jahresmeldung gebraucht
wird: `ageAt()` wandert von `jahresmeldung/tally.ts` nach `shared/rr/dates.ts`
— ADR-004s Auslöser, ein zweites Feature braucht sie. Die Methodik-Seite der
Excel-Datei gibt die konfigurierte Staffel aus statt eines festen Textes.

**Jahresmeldung.** Nur der Team-Filter und die Leiter-Definition ändern sich,
beide über dieselben neuen Einstellungen. Die Juniorleiter-Regel „Leiter unter
18" bleibt hartkodiert: sie ist eine Vorgabe des Bundes, nicht des Stamms.

## Code, der verschwindet

- `LEADER_ROLE_NAMES`, `ALWAYS_SHOWN_LEADER_ROLES`, `DEFAULT_FEE_CONFIG` aus
  `constants.ts`
- `roleRule` und die Variante `role` aus `shared/access/rules.ts`
- `beitraegeRoleIds` aus `Settings`, der Rollen-Picker aus `Admin.vue`,
  `COPY.beitraege*`-Strings zum Zugriff, `SetupHint.vue`
- die drei `KLEINGRUPPE_TYPE_ID`-Konstanten

`isLeaderRole()` in `shared/roles.ts` nimmt künftig die konfigurierten
Rollen-IDs als Argument statt die Namensliste zu importieren. Das ist der
größte mechanische Teil und betrifft `counts.ts`, `hierarchy.ts`, `rr.api.ts`
und `jahresmeldung.api.ts`.

## Teststrategie

Vitest, pure Logik (ADR-009). Keine Komponententests, wie gehabt.

| Einheit | Fälle |
|---|---|
| `settings.ts` — Validierung | vollständig; jede Pflichtangabe einzeln fehlend; Müll in Feldern; Leerwerte als gültige Aussage |
| `fee-tiers.ts` | Staffel kürzer als die Familie (letzte Position greift); Staffel mit 0 am Ende; Mitarbeiter und Juniorleiter mit und ohne eigenen Satz; beide belegen keine Geschwisterposition |
| `roles.ts` | `type: 'leader'` zählt immer; `extraLeaderRoleIds` ergänzt; leere Liste ist gültig |
| `tally.ts` | unverändert — die Regeln ändern sich nicht, nur ihre Herkunft |

Dazu ein Durchlauf gegen `rr-demo` mit einer frisch konfigurierten Installation
und ein Vergleich der Zahlen gegen den heutigen Stand.

## Risiken

| Risiko | Minderung |
|---|---|
| Fehlkonfiguration erzeugt plausibel aussehende falsche Zahlen | Pflichtangaben blockieren das Rendern; Vorschauzeile im Admin; Anzahlen an jeder Auswahl |
| Die Umstellung von `isLeaderRole` ändert Zahlen unbemerkt | Bestehende Tests decken die Zählpfade; Vergleich der Demo-Zahlen vor/nach |
| Nach dem Update ist die Installation unkonfiguriert | Bewusst: Hinweis statt Zahlen. Die Konfiguration dauert zwei Minuten und wird direkt nach dem Deploy gemeinsam gemacht |
| Beitragsabrechnung öffnet sich von 3 auf 14 Personen | Entschieden; in der ADR festgehalten, nicht stillschweigend |

## Offene Punkte

- Eine ADR muss ADR-008 und ADR-011 in dem Punkt ablösen, in dem sie die
  Rollenprüfung der Beitragsabrechnung begründen.
- Ob das CT-Recht `rr-dashboard.view` das Ausliefern der Dateien sperrt oder
  nur den Menüeintrag ausblendet, ist nicht verifiziert. Für die Entscheidung
  unerheblich — alle Daten kommen mit den Rechten des Betrachters — aber es
  gehört in die ADR als bekannte Unschärfe.

## Change log

- 2026-10-09 — erstellt
