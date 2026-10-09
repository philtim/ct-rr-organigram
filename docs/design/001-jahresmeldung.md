# Design Spec 001: Jahresmeldung — Mitgliederzahlen für den Bund

- **Status:** draft
- **Owner:** UX/UI Design Director
- **Date:** 2026-10-09
- **Related artifacts:**
  - PRD: `docs/PRD.md` (US-3 Organigramm, US-4 Skeleton, US-5 Fehlerbehandlung,
    US-7 Responsive, US-8 CSS-Scoping, US-9 Visuelles System)
  - ADR-004 Module structure, ADR-007 Multiple tabs one module,
    ADR-008 Declarative access rules, ADR-011 Personal data
  - Design Baseline: existiert nicht; abgeleitet aus PRD (siehe unten)

## Design Baseline (abgeleitet, nicht neu verhandelt)

| | |
|---|---|
| Accessibility | WCAG AA (US-9) |
| Responsive | Breakpoints 767 px / 1023 px, wie `Dashboard.vue` |
| Theming | Light + Dark über `prefers-color-scheme`, Tokens aus `App.vue` |
| Density | Comfortable; die Tabelle selbst compact |
| i18n | Deutsch only (PRD Non-Goal) |
| Design system | Keine Library. Handgerollte Vue-SFCs, scoped CSS, alles unter `.rr-dashboard-root` (US-8) |

## Context

Einmal im Jahr meldet die Stammleitung die Mitgliederzahlen an den
Bundesverband. Das Zielformular ist eine Matrix aus sechs Spalten
(Jungen, Mädchen, Juniorleiter männlich/weiblich, Mitarbeiter
männlich/weiblich) und sieben Zeilen (fünf Teilstämme, „Mitarbeiter ohne
Team", „Gesamt") plus drei Summenzeilen. Heute werden diese ~45 Zahlen von
Hand aus ChurchTools zusammengezählt.

Das ist ein **Transkriptions-Job**, kein Überblicks-Job: die Zahlen werden
nicht interpretiert, sondern abgetippt. Daraus folgt die zentrale
Designentscheidung dieser Spec — die Ansicht bildet das Zielformular nach,
statt eine eigene, „schönere" Gliederung zu erfinden.

## Users and their goals in this flow

- **Primary:** Stammleiter / Stammwart Hauptstamm. Sitzt am Desktop, hat das
  Bundesportal in einem zweiten Fenster offen, tippt Zeile für Zeile ab. Will
  nicht rechnen und nicht prüfen müssen, ob eine Zahl eine Teilsumme ist.
- **Secondary:** Stammleiter Teilstamm. Liest dieselbe Tabelle gelegentlich,
  um die eigene Zeile zu kennen. Kein eigener Flow.

## Flow overview

1. Nutzer öffnet Tab „Jahresmeldung".
2. Extension lädt Hauptstamm, Teilstämme, Teams und deren aktive Mitglieder
   inkl. `birthday` und Geschlecht.
3. Tabelle rendert; Header zeigt „Stand: heute, HH:MM".
4. Falls Daten fehlen: Datenqualitäts-Panel nennt Anzahl und Namen mit Link
   nach ChurchTools.
5. Nutzer tippt die Zahlen ins Bundesportal ab; optional Klick auf eine Zahl,
   um sie zu kopieren.
6. Optional: Lücken in ChurchTools schließen → „Aktualisieren" → Zahlen
   stimmen.

---

## Platzierung

**Entscheidung: eigener Tab „Jahresmeldung", immer sichtbar, ohne eigene
Zugriffsregel.**

Verworfene Alternativen:

| Option | Warum nicht |
|---|---|
| Panel unten im Organigramm-Tab | 7×6-Tabelle unter einem 5-Spalten-Grid ist auf Mobile unrettbar; ein Jahres-Task bekäme dauerhaft Platz auf der Tagesansicht |
| Zahlen in die Teilstamm-Karten | Zerstört die Scanbarkeit der Karten; „Mitarbeiter ohne Team" hat dort keinen Platz; der Nutzer müsste weiter selbst summieren |
| Modal / Drawer | Breite Tabelle im Modal ist eng, nicht verlinkbar, nicht druckbar — man will die Seite dauerhaft neben dem Portal offen haben |

Der Tab folgt dem Muster der Beitragsabrechnung (ADR-007): periodische
Verwaltungspflicht, eigene Zählregeln, eigenes Datenqualitäts-Panel, eigener
Tab. Anders als dort gibt es **keine** Rollenkonfiguration: wer das Dashboard
sehen darf, sieht auch die Jahresmeldung. Die Ansicht zeigt Aggregate; die
einzigen Namen, die auftauchen, sind die von Personen mit Datenlücken.

### Konsequenz für die Tab-Bar

`TabBar.vue` rendert heute nichts, wenn nur ein Tab sichtbar ist. Mit einem
immer sichtbaren dritten Tab gibt es künftig immer mindestens zwei Einträge —
die Bar ist also permanent da. Das ist beabsichtigt, aber es ändert den
Ersteindruck für Nutzer, die bisher nur das Organigramm kannten. Die
Ausblend-Logik bleibt trotzdem im Code: sie ist die korrekte Reaktion auf eine
Installation, in der aus anderen Gründen nur ein Tab übrig bleibt.

---

## Zählregeln

Der Kern der Spec. Jede Zelle muss ohne Rückfrage herleitbar sein.

### Scope

Identisch zum Organigramm: der konfigurierte Hauptstamm, die konfigurierten
`teilstammIds`, deren Teams (`groupTypeId === 1`). Ein nicht konfigurierter
Teilstamm trägt niemanden bei — dieselbe Eigenschaft, die die
Beitragsabrechnung dokumentiert.

Mitgliedschaften zählen nur mit `group_member_statuses[]=active`.

### Schritt 1 — Kategorie der Person (einmal, personenweit)

Ausgewertet über **alle** Mitgliedschaften im Scope. Leiter schlägt
Teilnehmer, wie in `hierarchy.ts` bereits etabliert.

| Bedingung | Kategorie |
|---|---|
| Mindestens eine Mitgliedschaft mit `isLeaderRole()` **und** Alter ≥ 18 | `mitarbeiter` |
| Mindestens eine Mitgliedschaft mit `isLeaderRole()` **und** Alter < 18 | `juniorleiter` |
| Mindestens eine Mitgliedschaft mit `isLeaderRole()` **und** Geburtsdatum fehlt | `unklar` → Datenqualität |
| Sonst | `teilnehmer` |

Alter zum Zeitpunkt des Abrufs (Stichtag = jetzt). `isLeaderRole()` kommt aus
`src/shared/roles.ts` — dieselbe Definition, die Organigramm und
Beitragsabrechnung verwenden.

**Damit ist die Doppelzählung gelöst, nach der das Formular ausdrücklich
fragt:** Ein Pfadranger, der als Leiter eingetragen ist und noch keine 18 ist,
ist `juniorleiter` und erscheint ausschließlich in den Juniorleiter-Spalten —
nie zusätzlich bei Jungen/Mädchen. Die Kategorie ist personenweit eindeutig,
also kann eine Person gar nicht in zwei Spalten landen.

### Schritt 2 — Zeile der Person (einmal, personenweit)

| Bedingung | Zeile |
|---|---|
| Team-Mitgliedschaft unter genau einem Teilstamm | dieser Teilstamm |
| Team-Mitgliedschaften unter mehreren Teilstämmen | der Teilstamm, in dem die Person eine Leiter-Rolle hält; bei Gleichstand der erste in Anzeigereihenfolge → Datenqualität |
| Keine Team-Mitgliedschaft, aber Mitgliedschaft im Hauptstamm oder in einer Teilstamm-MA-Gruppe | „Mitarbeiter ohne Team" |

Jede Person landet in **genau einer** Zeile und **genau einer** Spalte. Daraus
folgt die Invariante, auf der die ganze Tabelle steht:

> Die Summe aller Zellen = Anzahl eindeutiger Personen im Scope.

Die „Gesamt"-Zeile ist deshalb eine echte Spaltensumme und keine separat
berechnete Zahl. Ein Unit-Test prüft die Invariante.

### Schritt 3 — Spalte

`sexId` kennt vier Werte plus `null` (Recon: `GET /person/masterdata`):

| `sexId` | Bedeutung | Behandlung |
|---|---|---|
| `1` | männlich | m-Spalte |
| `2` | weiblich | w-Spalte |
| `0` | unbekannt (explizit) | ohne Zuordnung, Ursache „nicht gepflegt" |
| `null` | Feld nie gesetzt | identisch zu `0` |
| `3` | divers | ohne Zuordnung, Ursache „divers" |

| Kategorie | sexId 1 | sexId 2 | sexId 0/null/3 |
|---|---|---|---|
| `teilnehmer` | Jungen | Mädchen | ohne Zuordnung |
| `juniorleiter` | Juniorleiter männlich | Juniorleiter weiblich | ohne Zuordnung |
| `mitarbeiter` | Mitarbeiter männlich | Mitarbeiter weiblich | ohne Zuordnung |
| `unklar` (kein Geburtsdatum) | — | — | ohne Zuordnung |

Die Spalte heißt **„ohne Zuordnung"**, nicht „ohne Angabe". Der Unterschied ist
nicht kosmetisch: bei `sexId = 3` *gibt* es eine Angabe, sie passt nur nicht in
ein Formular mit zwei Geschlechtern. Die Spalte fasst beide Fälle zusammen, das
Datenqualitäts-Panel trennt sie — der eine ist in ChurchTools behebbar, der
andere nicht und braucht eine Entscheidung der Stammleitung.

Die Spalte rendert nur, wenn ihre Gesamtsumme > 0 ist. Sie steht rechts, hinter
einer doppelten Trennlinie, damit klar ist: gehört nicht ins Formular.

### Zeile „Mitarbeiter ohne Team"

Alle sechs Zellen werden gerechnet und als Zahl gerendert — kein „—". Falls
dort eine Person ohne Leiter-Rolle auftaucht, erscheint sie bei
Jungen/Mädchen, statt aus der Tabelle zu verschwinden. Das hält die Invariante
aus Schritt 2. In der Praxis stehen dort Nullen; das ist die richtige Art,
null zu zeigen.

### Zeilen-Summen (nicht Teil des Formulars)

Am rechten Rand stehen drei abgeleitete Spalten, hinter einer Trennlinie und
auf getönter Fläche:

| Spalte | Berechnung |
|---|---|
| Teilnehmer | Jungen + Mädchen |
| Leiter | Juniorleiter m/w + Mitarbeiter m/w — Juniorleiter zählen als Leiter, sie leiten, sie sind nur unter 18 |
| Gesamt | alle Zellen der Zeile, einschließlich „ohne Zuordnung" |

Sie werden beim Lesen berechnet, nicht gespeichert, und können deshalb nicht
von den Zellen abweichen, die sie zusammenfassen. Das Bundesformular kennt sie
nicht — die visuelle Absetzung und eine Fußnote sagen das, damit niemand eine
Summe ins Portal überträgt.

Die drei Summenzeilen des Formulars („Gesamt Entdecker", „Gesamt Rangers und
Leiter", „Gesamt Stamm") wurden nach dem ersten Praxiseinsatz gestrichen: die
Zeilen-Summe „Gesamt" beantwortet dieselbe Frage pro Teilstamm, und die
Namensheuristik, mit der der Entdecker-Teilstamm erkannt wurde, entfällt
ersatzlos mit ihnen.

### Zeilenreihenfolge und -beschriftung

Zeilen tragen den **Teilstamm-Namen verbatim aus ChurchTools** und stehen in
derselben Reihenfolge wie die Karten im Organigramm-Tab (Reihenfolge aus
`GET /groups/{id}/children`, gefiltert). Keine hartkodierten Namen, keine
Umbenennung auf „Entdecker" — das PRD hat in v0.4 entschieden, dass die
Hierarchie zur Laufzeit gelesen wird, und diese Spec bricht das nicht.

---

## Screens and states

### Screen: Jahresmeldung

**Purpose:** Die Zahlen so zeigen, dass man sie ohne Zwischenschritt ins
Bundesformular abtippen kann.

#### Default (Desktop, ≥1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Organigramm  │  Beitragsabrechnung  │  Jahresmeldung                                 │
│                                        ▔▔▔▔▔▔▔▔▔▔▔▔▔▔                                 │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  RR Jahresmeldung                                            [ ↻ Aktualisieren ]     │
│  Stand: heute, 14:32                                                                 │
│                                                                                      │
│  ⓘ Aktueller Stand aus ChurchTools, gegliedert wie das Formular „Mitgliederzahlen"   │
│    im Bundesportal. Zeilen und Spalten stehen in derselben Reihenfolge.              │
│                                                                                      │
│  ┌─ MITGLIEDERZAHLEN ──────────────────────────────────────────────────────────────┐ │
│  │                  │       │       │ Jun-  │ Jun-  │ Mit-  │ Mit-  ║  TN │  L  │ Ges │ │
│  │                  │Jungen │Mädchen│ JL m  │ JL w  │ MA m  │ MA w  ║     │     │     │ │
│  │ ─────────────────┼───────┼───────┼───────┼───────┼───────┼───────╫─────┼─────┼─────│ │
│  │  Entdecker       │  18   │  14   │   0   │   0   │   4   │   6   ║  32 │  10 │  42 │ │
│  │  Forscher        │  21   │  17   │   1   │   0   │   3   │   5   ║  38 │   9 │  47 │ │
│  │  Kundschafter    │  16   │  10   │   0   │   1   │   2   │   4   ║  26 │   7 │  33 │ │
│  │  Pfadfinder      │  28   │  24   │   3   │   1   │   5   │   3   ║  52 │  12 │  64 │ │
│  │  Pfadranger      │  13   │   6   │   2   │   1   │   2   │   2   ║  19 │   7 │  26 │ │
│  │  Mitarb. o. Team │   0   │   0   │   0   │   0   │   2   │   1   ║   0 │   3 │   3 │ │
│  │ ═════════════════╪═══════╪═══════╪═══════╪═══════╪═══════╪═══════╬═════╪═════╪═════│ │
│  │  Gesamt          │  96   │  71   │   6   │   3   │  18   │  21   ║ 167 │  48 │ 215 │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                   ↑ Summen, nicht im Bundesformular   │
│                                                                                      │
│  ┌─ MITARBEITER OHNE TEAM ────────────────────┐                                      │
│  │  Mitarbeiter des Hauptstamms oder eines    │                                      │
│  │  Teilstamms, die in keinem Team stehen.    │                                      │
│  │                                            │                                      │
│  │  Anke Leiter            [ In ChurchTools ↗]│                                      │
│  │  Max Werner             [ In ChurchTools ↗]│                                      │
│  └────────────────────────────────────────────┘                                      │
│                                                                                      │
│  ▶ Wie wird gezählt?                                                                 │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

#### Default mit Datenlücken

Die Spalte „ohne Angabe" und das Panel erscheinen nur in diesem Fall.

```
│  ┌─ MITGLIEDERZAHLEN ──────────────────────────────────────────────────────────────┐ │
│  │                 │ Jungen │ Mädchen │ JL m │ JL w │ MA m │ MA w ║ ohne Zuordnung │ │
│  │ ────────────────┼────────┼─────────┼──────┼──────┼──────┼──────╫────────────────│ │
│  │  Entdecker      │   18   │   14    │  0   │  0   │  4   │  6   ║     12         │ │
│  │  …              │        │         │      │      │      │      ║                │ │
│  │ ════════════════╪════════╪═════════╪══════╪══════╪══════╪══════╬════════════════│ │
│  │  Gesamt         │   96   │   71    │  6   │  3   │  18  │  21  ║     73         │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                           ↑ gehört nicht ins Bundesformular           │
│                                                                                      │
│  ┌─ DATENQUALITÄT ─────────────────────────────────────────────────────────────────┐ │
│  │  73 Personen fehlen in den Formularspalten, zählen aber in der Spalte „Gesamt".│ │
│  │                                                                                 │ │
│  │     ▼ Geschlecht nicht gepflegt (73) — in ChurchTools nachtragen                │ │
│  │         Lena Hofmann        Entdecker · Biber          [ In ChurchTools ↗ ]     │ │
│  │         Tim Bauer           Forscher · Adler           [ In ChurchTools ↗ ]     │ │
│  │         … 71 weitere                          [ Alle anzeigen ]                 │ │
│  │                                                                                 │ │
│  │     ▶ Geschlecht divers (0) — lässt sich im Formular nicht abbilden             │ │
│  │                                                                                 │ │
│  │     ▶ Leiter ohne Geburtsdatum (0) — Mitarbeiter oder Juniorleiter unklar       │ │
│  │                                                                                 │ │
│  │     ▼ In mehreren Teilstämmen aktiv (17) — jeweils einmal gezählt               │ │
│  │         Ole Reinhardt       gezählt bei: Forscher      [ In ChurchTools ↗ ]     │ │
│  │         … 16 weitere                          [ Alle anzeigen ]                 │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
```

#### „Wie wird gezählt?", aufgeklappt

```
│  ▼ Wie wird gezählt?                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │  Zeile          Der Teilstamm, unter dem die Person in einem Team steht.      │   │
│  │                 Wer in keinem Team steht, aber Mitarbeiter ist, zählt unter   │   │
│  │                 „Mitarbeiter ohne Team".                                      │   │
│  │  Jungen/Mädchen Teilnehmer ohne Leitungs- oder Mitarbeiterrolle.              │   │
│  │  Juniorleiter   Leiter unter 18 Jahren. Sie zählen nicht zusätzlich bei       │   │
│  │                 Jungen/Mädchen.                                               │   │
│  │  Mitarbeiter    Leiter ab 18 Jahren. Als Leitungsrolle gelten Leiter,         │   │
│  │                 Co-Leiter, Mitarbeiter, Teamhelfer und Organisator.           │   │
│  │  Mehrfach       Wer in zwei Teams steht, zählt einmal.                        │   │
│  │  Stand          Alle Zahlen beziehen sich auf jetzt, nicht auf einen          │   │
│  │                 Stichtag.                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
```

#### Loading

Skeleton derselben Tabelle: Kopfzeile echt, Zellen als graue Balken, gleiche
Zeilen- und Spaltenzahl. Struktur steht sofort, nichts springt beim Einfüllen.
Analog `SkeletonLayout.vue` (US-4), mit demselben Puls.

```
│  ┌─ MITGLIEDERZAHLEN ──────────────────────────────────────────┐ │
│  │                 │ Jungen │ Mädchen │ JL m │ JL w │ MA m │ MA w│ │
│  │ ────────────────┼────────┼─────────┼──────┼──────┼──────┼─────│ │
│  │  ▒▒▒▒▒▒▒▒▒      │  ▒▒▒   │   ▒▒▒   │ ▒▒   │ ▒▒   │ ▒▒   │ ▒▒  │ │
│  │  ▒▒▒▒▒▒▒        │  ▒▒▒   │   ▒▒▒   │ ▒▒   │ ▒▒   │ ▒▒   │ ▒▒  │ │
│  └─────────────────────────────────────────────────────────────┘ │
```

#### Empty (keine Konfiguration)

Kein Hauptstamm im KV-Store → dieselbe Meldung wie im Organigramm:
„Bitte zuerst die Hauptstamm-Gruppe unter Admin → Extensions konfigurieren."
Keine leere Tabelle rendern.

Hauptstamm konfiguriert, aber keine Teilstämme ausgewählt → Tabelle mit nur
der Zeile „Mitarbeiter ohne Team" und „Gesamt", darüber der Hinweis „Keine
Teilstämme ausgewählt. Die Zahlen sind unvollständig."

#### Error (Totalausfall)

`role="alert"`-Block wie `rr-dash__error`, Tabelle wird nicht gerendert.
Keine Tabelle mit Nullen — eine Null sieht aus wie eine Antwort.

#### Partial error (einzelne Teams nicht ladbar)

Das ist hier der teuerste Fehler, weil eine zu niedrige Zahl aussieht wie eine
richtige. Deshalb:

- Betroffene Zeile zeigt in allen Zellen `?`, nicht 0.
- **Die „Gesamt"-Zeile und alle Zeilen-Summen zeigen ebenfalls `?`**, denn
  eine Teilsumme, die als Gesamtsumme gelesen wird, ist schlimmer als keine
  Zahl.
- Warnbanner über der Tabelle, nicht nur ein Toast: „Nicht alle Teams konnten
  geladen werden. Die markierten Zahlen sind unvollständig — bitte nicht
  melden, sondern neu laden."
- Der bestehende `Toast.vue` bleibt zusätzlich, für Konsistenz mit US-5.

```
│  │  Pfadfinder          │   ?    │   ?     │    ?     │    ?     │    ?    │   ?    │ │
│  │ ═════════════════════╪════════╪═════════╪══════════╪══════════╪═════════╪════════│ │
│  │  Gesamt              │   ?    │   ?     │    ?     │    ?     │    ?    │   ?    │ │
```

#### Success

Kein eigener Success-State — die Ansicht ist read-only. Die einzige
Rückmeldung ist der Kopier-Toast (siehe Interaktionen).

---

### Responsive

#### Mobile (<768 px)

Die Tabelle bleibt eine Tabelle. Kein Umbau in Karten: die Formularordnung
*ist* der Wert der Ansicht, und wer am Handy abtippt, braucht sie genauso.
Erste Spalte sticky, horizontal scrollbar.

```
┌───────────────────────────────┐
│ Organigramm │ Beiträge │ Jahr…│   ← Tab-Bar scrollt horizontal
├───────────────────────────────┤
│ RR Jahresmeldung         [↻]  │
│ Stand: heute, 14:32           │
│                               │
│ ⓘ Aktueller Stand, gegliedert │
│   wie das Bundesformular.     │
│                               │
│ ┌─ MITGLIEDERZAHLEN ────────┐ │
│ │▒▒▒▒▒▒▒▒▒│ Jungen │ Mädch… │ │  ← ▒ = fixierte Spalte
│ │▒────────┼────────┼────────│ │     ─ ─ ─ ─ ─ ─ ─ ▸ scroll
│ │▒Entdeck.│   18   │   14   │ │
│ │▒Forscher│   21   │   17   │ │
│ │▒Kundsch.│   16   │   10   │ │
│ │▒Pfadfin.│   28   │   24   │ │
│ │▒Pfadran.│   13   │    6   │ │
│ │▒MA o.T. │    0   │    0   │ │
│ │▒════════╪════════╪════════│ │
│ │▒Gesamt  │   96   │   71   │ │
│ └───────────────────────────┘ │
│      ◂ scrollen für mehr ▸    │
│                               │
│ ┌─ MITARBEITER OHNE TEAM ───┐ │
│ │ Anke Leiter    ChurchTools│ │
│ │ Max Werner     ChurchTools│ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

- Scroll-Schatten an der rechten Kante der sticky-Spalte, solange noch Inhalt
  rechts liegt. Ohne diesen Hinweis übersieht man, dass es weitergeht.
- Spaltenköpfe kürzen auf „JL m", „JL w", „MA m", „MA w"; Langform im
  `title`/`abbr`.
- Die Summen-Kacheln stapeln.

#### Tablet (768–1023 px)

Tabelle passt ohne Scroll, Spaltenköpfe zweizeilig. Datenqualitäts-Panel
unter die Summen, volle Breite.

#### Desktop (≥1024 px)

Wie oben. Maximalbreite folgt `.rr-dash__inner` (1280 px).

---

### Interactions

- **Klick auf eine Zahl** → Wert in die Zwischenablage, Toast „18 kopiert".
  Die Zelle ist dafür ein `<button>` innerhalb der `<td>`, nicht ein
  klickbares `<td>`. Kein „ganze Tabelle kopieren": das Bundesportal hat
  Einzelfelder, ein TSV-Block nützt dort nichts.
- **„In ChurchTools ↗"** → öffnet die Personenansicht in neuem Tab
  (`rel="noopener"`). Die URL kommt unverändert aus `person.frontendUrl` der
  Member-Antwort, sie wird nicht konstruiert. Nur im Datenqualitäts-Panel, nie
  in der Tabelle.
- **Gruppe im Datenqualitäts-Panel** → `<details>`; gefüllte Gruppen offen,
  leere zugeklappt und mit „(0)" beschriftet. Ab 10 Einträgen zeigt die Liste
  die ersten 10 plus „Alle anzeigen".
- **„Wie wird gezählt?"** → `<details>`/`<summary>`, zugeklappt per Default,
  Zustand nicht persistiert.
- **„Aktualisieren"** → identisch zum Organigramm: lädt alles neu, Button
  disabled während des Ladens.
- **Keyboard:** Tab-Reihenfolge Header → Aktualisieren → Tabellenzellen
  zeilenweise → Summen → Details → Datenqualitäts-Links. Enter/Space auf
  einer Zelle kopiert. `Escape` schließt das Details-Element.

### Accessibility

- Echtes `<table>` mit `<caption>` („Mitgliederzahlen für die Jahresmeldung"),
  `<thead>`, `<th scope="col">` und `<th scope="row">`. Keine Div-Tabelle —
  ein Screenreader muss „Pfadfinder, Juniorleiter männlich, 3" ansagen können.
- Zweizeilige Spaltenköpfe als `<abbr title="Juniorleiter männlich">`, damit
  die Kurzform nicht buchstabiert wird.
- Headings: `<h1>` RR Jahresmeldung, `<h2>` Mitgliederzahlen / Summen /
  Datenqualität.
- Kopier-Toast über `aria-live="polite"`.
- Die `?`-Zellen des Partial-Error-States brauchen eine textliche Erklärung,
  nicht nur ein Zeichen: `aria-label="unbekannt, Team konnte nicht geladen
  werden"`.
- Die Spalte „ohne Angabe" wird durch die doppelte Linie *visuell* abgesetzt;
  für Screenreader trägt ihr `<th>` zusätzlich den Text „ohne Angabe, nicht
  Teil des Formulars".
- Kontrast: die Zahlen sind das Wichtigste auf der Seite — `--rr-text-primary`,
  nicht `secondary`. Zeilenbeschriftungen dürfen `secondary` sein.
- Zebra-Streifen nur als sehr schwache Flächenaufhellung; bei einer Matrix
  dieser Breite verhindern sie Zeilensprünge, dürfen aber den Kontrast der
  Zahlen nicht senken.

### Edge cases

- Teilstamm-Name länger als die Spalte → umbrechen, Zeilenhöhe wächst. Nicht
  kürzen: der Name ist die Zuordnung zum Formular.
- Mehr als fünf Teilstämme → die Tabelle wächst nach unten, kein Sonderfall.
- Ein Teilstamm ohne Teams → Zeile mit Nullen, nicht ausblenden. Eine fehlende
  Zeile liest sich wie „vergessen".
- Dreistellige Zahlen → Spaltenbreite auf vier Ziffern auslegen, tabellarische
  Ziffern (`font-variant-numeric: tabular-nums`), rechtsbündig.
- Person ohne Geschlecht **und** ohne Geburtsdatum → erscheint in beiden
  Listen des Panels, zählt einmal in „ohne Angabe".

---

## New components needed

| Komponente | Zweck | Varianten | Notiz |
|---|---|---|---|
| `JahresmeldungTable.vue` | Die Matrix inkl. Gesamt-Zeile | default, skeleton, partial-error | Eigene SFC, damit der Skeleton dieselbe Struktur teilen kann |
| `OhneTeamPanel.vue` | Namen hinter der Zeile „Mitarbeiter ohne Team", mit ChurchTools-Link | default, leer | Die einzige Zeile, deren Mitglieder sich nicht durch Öffnen eines Teams prüfen lassen |
| `DatenqualitaetPanel.vue` | Vier aufklappbare Gruppen mit Personen-Links | Gruppe leer → zugeklappt und als „(0)" sichtbar; Gruppe gefüllt → aufgeklappt | Nahe verwandt mit `DuplicatesPanel.vue` — Wiederverwendung prüfen, nicht erzwingen. Bei >10 Einträgen die ersten 10 zeigen plus „Alle anzeigen" — die größte Gruppe hat auf live 73 Einträge und darf die Seite nicht übernehmen |
| `CopyableNumber.vue` | Zahl als Kopier-Button | default, unbekannt (`?`) | Sehr klein; ggf. in die Tabelle inlinen statt eigene Datei |
| — | Toast | — | `Toast.vue` wiederverwenden |

## Copy guidance

- Überschrift: „RR Jahresmeldung". Nicht „Mitgliederzahlen" — das ist der Name
  der Tabelle, nicht der Ansicht.
- Der Einleitungssatz nennt zwei Dinge und nicht mehr: woher die Zahlen kommen
  und dass die Gliederung dem Formular folgt.
- Fehlermeldungen sachlich und handlungsorientiert, nie entschuldigend. Beim
  Partial Error gehört die Handlungsanweisung in den ersten Satz: „bitte nicht
  melden, sondern neu laden".
- Im Datenqualitäts-Panel nie das fehlende Feld bewerten („schlecht gepflegt"),
  nur benennen.
- Alle Strings nach `COPY` in `src/shared/constants.ts`, Präfix `jahresmeldung…`.

## Non-goals

- Kein Export (CSV/XLSX/Druck). Die Zahlen werden abgetippt, nicht
  weiterverarbeitet. Wenn sich das ändert, ist es eine eigene Entscheidung.
- Kein Stichtag und keine Historie. Immer „jetzt".
- Kein Abhaken bereits übertragener Zeilen. Verlockend, aber Zustand bräuchte
  den KV-Store für etwas, das drei Minuten im Jahr lebt.
- Keine Schreiboperationen. Lücken werden in ChurchTools geschlossen, nicht
  hier.
- Keine Liste der Personen pro Zelle. Nur das Datenqualitäts-Panel nennt
  Namen, und nur dort, wo etwas fehlt.
- Keine farbliche Bewertung von Zahlen (konsistent zum PRD-Non-Goal).

## Pre-Implementation Recon

Durchgeführt 2026-10-09 gegen `rr-demo.church.tools` (API-Vertrag) und
`jms-altensteig.church.tools` (Datenabdeckung, nur lesend, nur Aggregate).

### 1. Geschlechtsfeld — geklärt

`GET /groups/{id}/members?personFields[]=sexId` liefert das Feld inline, in
jeder Member-Zeile, unter `personFields.sexId`. Kein zusätzlicher
`/persons`-Batch nötig. `personFields[]=sex` und `…=gender` liefern leere
Objekte — `sexId` ist der richtige Name.

Werte laut `GET /person/masterdata` → `sexes`:
`0 unbekannt, 1 männlich, 2 weiblich, 3 divers`, dazu `null`, wenn das Feld nie
gesetzt wurde. `0` und `null` sind operativ dasselbe; `3` ist es ausdrücklich
nicht (siehe Schritt 3).

### 2. Datenabdeckung auf der Live-Instanz — zwei klare Befunde

Scope: Hauptstamm 950 + fünf Teilstämme + 25 Teams, 366 eindeutige Personen.

| Kennzahl | Wert |
|---|---|
| Geburtsdatum gepflegt | **366 von 366 (100 %)** — auch bei allen 77 Leitern |
| Leiter unter 18 (= Juniorleiter nach der Regel) | 17 |
| Geschlecht verwertbar (m/w) | 293 von 366 (80,1 %) |
| Geschlecht `0 unbekannt` | 43 |
| Geschlecht `null` (nie gesetzt) | 30 |
| Geschlecht `3 divers` | 0 |
| Personen ohne Team | 5 |
| Personen in mehreren Teilstämmen | **17** |

**Die Altersregel trägt.** Geburtsdaten sind lückenlos gepflegt; der Fall
„Leiter ohne Geburtsdatum" ist heute leer. Die Kategorie bleibt trotzdem im
Code und im Panel — sie kostet nichts und fängt den Tag ab, an dem jemand ohne
Geburtsdatum angelegt wird.

**Das Geschlecht ist die eigentliche Baustelle.** 73 Personen (19,9 %) haben
keinen verwertbaren Wert. Die Ansicht kann daran nichts rechnen — sie kann es
nur sichtbar und behebbar machen. Zum Start wird das Datenqualitäts-Panel
deshalb der wichtigste Teil der Seite sein, nicht eine Randnotiz. Geprüft:
keine Sichtbarkeitsfrage, auch `GET /persons` liefert für dieselben 30
Personen `null`, während eigene Felder normal zurückkommen. Es sind echte
Datenlücken, alle in ChurchTools behebbar.

**17 Mehrfachzuordnungen sind kein Randfall.** Die Zeilen-Regel aus Schritt 2
greift bei knapp 5 % der Personen. Der entsprechende Abschnitt im Panel ist
also Normalbetrieb und muss gut lesbar sein, nicht versteckt.

### 3. Personen-Deeplink — geklärt, geschenkt

Jede Member-Zeile enthält bereits `person.frontendUrl`, z. B.
`…/?q=churchdb#PersonView/searchEntry:%231/`. Die URL wird **nicht**
konstruiert, sondern übernommen — damit funktioniert der Link in jeder
Installation, ohne dass das Format im Code steht.

### 4. Reihenfolge und Anzahl der Zeilen — geklärt

`GET /groups/{id}/children` antwortet auf beiden Instanzen alphabetisch nach
Titel. Gefiltert auf die konfigurierten Teilstämme ergibt das auf live
Entdecker, Forscher, Kundschafter, Pfadfinder, Pfadranger — zufällig genau die
Formularreihenfolge. Darauf wird sich nicht verlassen: die Zeilen tragen die
ChurchTools-Namen, die Zuordnung zum Formular liest der Nutzer ab.

Die Live-Instanz hat mit `RR Wegbereiterstamm-MA` einen **sechsten**
Teilstamm-Kandidaten. Die Tabelle darf nicht auf fünf Zeilen ausgelegt sein.

Nebenbefund: Teilstamm-MA-Gruppen haben auf live `groupTypeId 10`, auf der
Demo `2`. Für diese Spec ohne Folgen — der Scope kommt aus der Konfiguration,
und der Teams-Filter auf `groupTypeId === 1` stimmt auf beiden Instanzen.

### 5. Noch offen — braucht eine Antwort vom Bund, nicht vom Code

- **Umgang mit `divers`.** Heute 0 Fälle, also nicht dringend. Sobald es
  eintritt, braucht es eine Festlegung, wie der Bund das gemeldet haben will.

## Decisions captured here

- **Formulartreue schlägt Eigenentwurf.** Zeilen- und Spaltenreihenfolge
  stammen aus dem Bundesformular, nicht aus der Datenlogik.
- **Spalte „ohne Angabe" statt stiller Rundung.** Lieber eine Spalte, die nicht
  ins Formular gehört, als eine Zahl, die falsch ist. Sie rendert nur bei
  Bedarf, damit der Normalfall 1:1 bleibt.
- **Jede Person genau eine Zelle.** Macht „Gesamt" zu einer echten
  Spaltensumme und die Invariante testbar.
- **`?` statt 0 bei Teilausfall, und zwar bis in die Gesamtzeile hinauf.**
- **Entdecker per Namensheuristik statt Konfiguration**, mit sichtbarem
  Scheitern.
- **Tabelle bleibt auf Mobile eine Tabelle**, mit sticky erster Spalte.

## Risks

| Risiko | Minderung |
|---|---|
| Falsche Zahl wird an den Bund gemeldet | Invarianten-Test, `?` statt stiller Teilsummen, „Wie wird gezählt?" macht jede Zelle nachvollziehbar |
| **20 % ohne Geschlecht — die Meldung ist am Starttag nicht ausfüllbar** | Das ist kein Designrisiko, sondern ein Datenbestandsrisiko, das die Ansicht aufdeckt statt verursacht. Panel priorisiert die Behebung; die Zahl sinkt mit jeder Korrektur in ChurchTools. Der Stammleitung muss vor dem ersten Einsatz klar sein, dass hier Vorarbeit liegt |
| „Leiter unter 18" trifft nicht die Definition des Bundes | Regel sitzt in einer Funktion mit eigenem Test; Austausch ändert kein Layout |
| Geburtsdaten verschlechtern sich künftig | Heute 100 % gepflegt; die Kategorie „Leiter ohne Geburtsdatum" bleibt trotzdem bestehen und macht einen Rückfall sofort sichtbar |

## Verhältnis zu ADR-011

ADR-011 zieht die Linie für die **Beitragsabrechnung**: die Ansicht rendert
Aggregate, Personendaten existieren nur im Export-Pfad. Die Jahresmeldung
bewegt sich entlang derselben Linie, aber nicht identisch:

- Die Tabelle selbst ist reine Aggregation — kein Name, kein Datum.
- Das Datenqualitäts-Panel nennt Namen. Das ist neu gegenüber ADR-011, aber
  nicht gegenüber dem Produkt: `DuplicatesPanel.vue` tut es bereits im
  Organigramm-Tab, und Leiternamen stehen seit US-3 auf jeder Karte.
- **Das Panel zeigt nie den fehlenden Wert selbst** — weder Geburtsdatum noch
  Geschlecht. Es sagt *dass* etwas fehlt und verlinkt nach ChurchTools, wo die
  eigenen Berechtigungen des Betrachters gelten.
- Geburtsdaten liegen für die Dauer der Ansicht im Speicher, weil die
  Juniorleiter-Regel sie braucht. Sie gehören in eine nicht-reaktive Variable,
  nicht in einen `ref` — dieselbe Vorsichtsmaßnahme, die `useBeitraege` für
  den Export-Snapshot trifft.

**Handoff an den Solution Architect:** Diese drei Punkte sind eine Erweiterung
des Geltungsbereichs von ADR-011 und sollten dort als Amendment oder in einer
eigenen ADR festgehalten werden, bevor implementiert wird. Das ist keine
Designentscheidung.

## Verification protocol

Wenn die Implementierung zurückkommt, prüfe ich:

1. Alle Zustände vorhanden: default, mit Lücken, loading, empty (zwei
   Varianten), error, partial error.
2. Invariante: Summe aller Zellen = eindeutige Personen im Scope, als Test.
3. Ein Leiter unter 18 erscheint ausschließlich in der Juniorleiter-Spalte.
4. Partial Error färbt bis in die Gesamt-Zeile und die Zeilen-Summen durch.
5. Tastaturbedienung: Zelle fokussierbar, Enter kopiert, Toast wird angesagt.
6. Mobile: erste Spalte sticky, Scroll-Hinweis sichtbar, kein horizontaler
   Scroll der ganzen Seite.
7. Alle Selektoren unter `.rr-dashboard-root` (US-8).
8. Dark Mode: Zahlen mindestens AA gegen die Zebra-Fläche.

## Change log

- 2026-10-09 — erstellt
- 2026-10-09 — Pre-Implementation Recon eingearbeitet: `sexId` als Feldname und
  seine vier Werte bestätigt, `divers` von „nicht gepflegt" getrennt, Spalte von
  „ohne Angabe" in „ohne Zuordnung" umbenannt, Personen-Deeplink aus
  `person.frontendUrl` statt konstruiert, Live-Abdeckung ergänzt (Geburtsdatum
  100 %, Geschlecht 80 %, 17 Mehrfachzuordnungen)
- 2026-10-09 — nach dem ersten Praxiseinsatz: drei Zeilen-Summen (Teilnehmer,
  Leiter, Gesamt) am rechten Rand ergänzt; die drei Summenzeilen des Formulars
  und mit ihnen die Entdecker-Namensheuristik gestrichen; das frei gewordene
  Panel zeigt jetzt die Namen hinter „Mitarbeiter ohne Team"
