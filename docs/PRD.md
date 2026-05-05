# RR Dashboard — Mitarbeiter-Organigramm

- **Version:** 0.4
- **Autor:** [bitte ergänzen]
- **Datum:** 2026-05-05
- **Status:** Ready for Implementation
- **Projektgröße:** M (4–10 Stories)
- **Dateiname:** prd-rr-dashboard-organigram-v0.4.md

## Change History

| Datum | Version | Autor | Änderung |
|---|---|---|---|
| 2026-05-05 | 0.4 | [bitte ergänzen] | Pre-Implementation Recon gegen `rr-demo.church.tools` durchgeführt; alle sieben Recon-Punkte beantwortet. US-2 von "Leiter-Rollen-IDs auswählen" auf "Hauptstamm-Gruppe auswählen" reduziert, weil ChurchTools die Leiter/Teilnehmer-Klassifizierung über `role.isLeader` bereits selbst liefert (siehe Pre-Implementation Recon, Antwort 4). Hardgecodete Gruppennamen ("RR Gesamtmitarbeiter", Teilstamm-Namen) entfernt: Hauptstamm wird per KV-Store-Konfiguration gewählt, Teilstämme dynamisch aus dessen Children abgeleitet. `VITE_GATE_GROUP_ID` aus `.env`-Template entfernt — die Group-ID lebt zur Laufzeit im KV-Store. Open Questions geschlossen. |
| 2026-05-05 | 0.2 | [bitte ergänzen] | Visuelle Spezifikation aus Designentwurf eingearbeitet: Hauptstamm-Hero-Card mit Avatar-Initialen, Teilstamm-Karten als nested Cards mit eingebetteten Team-Chips, Timestamp im Header, Divider-Linie zwischen Ebenen, monochrome Farbpalette, Mobile-Collapse-Verhalten. US-6 Non-Goal "zuletzt aktualisiert" gestrichen — wurde zu Pflicht-Feature im Header. Neue US-9 für visuelles Layout-System ergänzt. |
| 2026-05-05 | 0.1 | [bitte ergänzen] | Initiales Draft |

## TL;DR

Eine ChurchTools-Extension, die für die Mitarbeiter einer konfigurierten Hauptstamm-Gruppe ein dreistufiges Organigramm der Mitarbeiterstruktur darstellt: Hauptstamm, alle direkten Kind-Gruppen ("Teilstämme") und deren Kind-Gruppen ("Teams"). Pro Box werden die Leiter namentlich angezeigt; pro Teilstamm und Hauptstamm werden Leiter- und Mitgliederzahlen aus den darunterliegenden Teams aufsummiert. Die Extension ist nur für Mitglieder der konfigurierten Hauptstamm-Gruppe zugänglich. Erfolg ist erreicht, wenn ein Stammleiter mit einem Klick einen aktuellen Überblick über die Besetzungssituation aller Teams hat, ohne sich durch die Gruppenstruktur klicken zu müssen.

Im Zielsystem der Autoren wird die Hauptstamm-Gruppe "RR Gesamt-Stammleitung" sein und die fünf Teilstämme heißen "RR Entdeckerstamm-MA", "RR Forscherstamm-MA", "RR Kundschafterstamm-MA", "RR Pfadfinderstamm-MA", "RR Pfadrangerstamm-MA". Diese Namen sind **nicht hartkodiert** — die Extension liest die Gruppen-Hierarchie zur Laufzeit aus, sodass andere Gemeinden mit anderen Strukturen den ZIP-Build unverändert installieren können.

## Problem Statement

**Problem:** Stammleiter und Stammwarte haben aktuell keinen einseitigen Überblick darüber, wie viele Leiter und Mitglieder die einzelnen Teams in den fünf Teilstämmen haben. Eine Bewertung der Besetzungssituation einzelner Teams oder ganzer Teilstämme erfordert mehrere Klicks und manuelles Zusammenzählen.

**Aktueller Zustand:** In ChurchTools navigiert man durch die Gruppenhierarchie, öffnet jede Team-Gruppe einzeln und liest dort manuell ab, wie viele Personen welche Rolle haben. Für einen Gesamtüberblick über alle 5 Teilstämme mit jeweils mehreren Teams sind dutzende Klicks und manuelles Summieren nötig.

**Auswirkung:** Stammleiter machen den Status-Check seltener als nötig. Schwach besetzte Teams oder fehlende Leitung fallen erst spät auf. Die Vorbereitung auf Leitungsrunden kostet unnötig Zeit.

## Target Users / Personas

### Stammleiter / Stammwart Hauptstamm *(Primary)*
- **Kontext:** Verantwortlich für den gesamten Mitarbeiterstamm (im Zielsystem "RR Gesamt-Stammleitung"). Mittleres bis hohes ChurchTools-Erfahrungslevel. Greift sowohl mobil (am Sonntag) als auch am Desktop (für Planungsarbeit unter der Woche) zu.
- **Jobs-to-be-done:** Schnellen Gesamtüberblick über die Besetzung aller Teilstämme bekommen. Vor Leitungsrunden Zahlen parat haben. Identifizieren, welche Teams unterbesetzt sind.
- **Pain Points:** Aktuelle Daten zu sammeln dauert zu lange. Vergleich zwischen Teilstämmen ist mühsam.

### Stammleiter / Stammwart Teilstamm
- **Kontext:** Verantwortlich für einen der fünf Teilstämme (z. B. Forscher). Sieht in ChurchTools dank bestehender Berechtigungen alle anderen Teilstämme mit. Nutzt das Tool sowohl für den eigenen Bereich als auch zum Quervergleich.
- **Jobs-to-be-done:** Eigenen Teilstamm im Blick behalten. Sehen, wie der eigene Bereich im Vergleich zu den anderen aussteht.
- **Pain Points:** Identisch zum Primary, aber mit stärkerem Fokus auf den eigenen Teilstamm.

### ChurchTools-Admin *(Secondary, einmalige Konfiguration)*
- **Kontext:** Technisch versierter Administrator der ChurchTools-Installation. Konfiguriert die Extension einmalig nach Installation.
- **Jobs-to-be-done:** Festlegen, welche `groupTypeRoleId`s in der Installation als "Leiter" gelten.
- **Pain Points:** Möchte nicht raten müssen, was die Extension von ihm braucht.

## Goals

- Ein Mitarbeiter der konfigurierten Hauptstamm-Gruppe sieht in unter 5 Sekunden nach Aufruf der Extension den vollständigen aktuellen Stand aller Teilstämme und Teams.
- Unterbesetzte Teams (wenig Leiter, wenig Mitglieder) sind auf einen Blick erkennbar.
- Die Extension liefert ohne weitere Clicks und ohne manuelles Summieren die Antworten auf "Wie viele Leiter hat Teilstamm X?" und "Wer leitet Team Y?"
- Personen ohne Berechtigung (Nicht-Mitglieder der konfigurierten Hauptstamm-Gruppe) sehen die Extension gar nicht erst inhaltlich.

## Scope

- Read-only Dashboard, gerendert als Organigramm mit drei Ebenen: Hauptstamm, Teilstämme, Teams.
- Zugangskontrolle (Gate) auf Basis der Mitgliedschaft in der konfigurierten Hauptstamm-Gruppe.
- Admin-Konfigurationsbildschirm zur einmaligen Auswahl der Hauptstamm-Gruppe (KV-Store-persistiert).
- Anzeige der Leiter-Personen mit vollem Vor- und Nachnamen pro Box.
- Aufsummierte Leiter- und Mitgliederzahlen auf Hauptstamm- und Teilstamm-Ebene aus den darunterliegenden Teams.
- Pro Team: Anzeige der Team-Leiter (Namen) und Anzahl der Mitglieder.
- Skeleton-Loading-Zustand während des initialen Datenladens.
- Toast-Fehlermeldung bei einzelnen fehlgeschlagenen Team-Abrufen.
- Manueller Refresh-Button zur erneuten Datenabfrage.
- Anzeige eines Aktualitäts-Timestamps ("Stand: HH:MM") im Dashboard-Header.
- Visuelle Darstellung der Hierarchie über nested Cards (Hauptstamm-Hero-Card, Teilstamm-Karten in Grid-Reihe, Team-Chips eingebettet in jede Teilstamm-Karte).
- Trennlinie zwischen Hauptstamm- und Teilstamm-Ebene als visuelles Hierarchie-Signal.
- Avatar-Initialen-Kreise (zwei Buchstaben aus Vor- und Nachname) für Leiter auf der Hauptstamm-Ebene.
- Monochrome, ChurchTools-konforme Farbpalette ohne kategoriale Einfärbung der Teilstämme.

## Out-of-Scope / Non-Goals

- **Drill-down:** Es wird KEINE Liste einzelner Mitglieder pro Team angezeigt. Mitglieder erscheinen nur als Zahl.
- **CSV-Export oder Druckansicht:** Wird in v1 NICHT implementiert.
- **Historische Daten / Trendanzeige:** Veränderungen über die Zeit werden NICHT erfasst oder angezeigt.
- **Schreiboperationen:** Mitglieder hinzufügen, Rollen ändern, Personen verschieben — all das findet weiterhin im Standard-ChurchTools-Modul statt, NICHT in dieser Extension.
- **Filter und Suche:** v1 zeigt das vollständige Organigramm ohne Filter, Suche oder Sortierung.
- **Caching / Offline-Fähigkeit:** v1 holt die Daten bei jedem Aufruf frisch. Caching kann später ergänzt werden, wenn die Performance es erfordert.
- **Service-Account / Backend-Komponente:** Die Extension läuft rein clientseitig mit der Session des angemeldeten Nutzers. Es wird KEIN Service-Account verwendet.
- **Push-Benachrichtigungen oder Alerts:** Die Extension benachrichtigt NICHT proaktiv bei Unterbesetzung.
- **Mehrsprachigkeit:** v1 ist Deutsch only. Internationalisierung ist Non-Goal.
- **Klassisches Organigramm mit Verbindungslinien:** Die Hierarchie wird durch nested Cards dargestellt, NICHT durch eine Node-und-Edge-Grafik mit gezeichneten Verbindungslinien zwischen Eltern- und Kind-Boxen.
- **Kategoriale Farbcodierung der Teilstämme:** Jeder Teilstamm bekommt KEINE eigene Akzentfarbe. Das Layout ist bewusst monochrom; Farbe würde Bedeutung suggerieren, die nicht da ist.
- **Visuelle Hervorhebung von Unterbesetzung:** Boxen mit niedrigen Zahlen werden NICHT rot oder anders hervorgehoben — die Bewertung obliegt dem Nutzer (siehe US-3).
- **Avatar-Bilder:** Es werden KEINE Profilfotos der Personen geladen oder angezeigt; nur Initialen-Kreise auf der Hauptstamm-Ebene.
- **Ausklappbare Team-Details auf Mobile:** Teams werden auf Mobile als Summary-Zeile pro Teilstamm dargestellt; eine Tap-to-Expand-Interaktion zum Aufklappen einzelner Teams ist v1.1.
- **Animationen jenseits des Skeleton-Pulses:** Übergänge zwischen Skeleton- und Datenansicht sowie Hover-Effekte auf Karten werden NICHT animiert (außer dem Skeleton-Puls selbst).

## Visual Designs

Drei verbindliche Screen-Mockups liegen dem PRD als PNGs bei und sind die visuelle Source of Truth für den Entwickler. Sie ersetzen jegliche frühere Beschreibung im Text bei Konflikten.

| Screen | Datei | Zweck |
|---|---|---|
| Desktop, Happy Path | `screens/screen-1-desktop.png` | Hauptansicht: Hauptstamm-Hero-Card, fünf Teilstamm-Karten, eingebettete Team-Chips. Bestätigt Layout, Schriftgrößen, Spacing, Farbabstufungen, Avatar-Pills. |
| Skeleton (Loading) | `screens/screen-2-skeleton.png` | Initialer Lade-Zustand. Bestätigt, dass das Skeleton dieselbe Struktur wie der Happy-Path hat — nur graue Platzhalter statt echter Inhalte. |
| Mobile, Happy Path | `screens/screen-3-mobile.png` | Mobile-Layout: gestapelte Teilstamm-Karten mit Summary-Zeile statt Team-Chips, kompakter Header, Hauptstamm-Leiter als Komma-Liste statt Pills. |

Die HTML-Quelldateien zu den Screens liegen unter `screens/desktop.html`, `screens/skeleton.html` und `screens/mobile.html` und können vom Entwickler als Pixel-Referenz im Browser geöffnet werden.

## User Stories

### US-1: Zugangskontrolle (Gate)

**Priorität:** P0
**Story:** Als ChurchTools-Nutzer möchte ich beim Aufruf der Extension automatisch geprüft bekommen, ob ich Mitglied in der konfigurierten Hauptstamm-Gruppe bin, damit ich nur Inhalte sehe, für die ich berechtigt bin.

#### Beschreibung

Die Extension prüft beim Start, ob der angemeldete Nutzer Mitglied (egal in welcher Rolle) der konfigurierten Hauptstamm-Gruppe ist. Die Gruppe wird per Admin-Konfiguration (US-2) im KV-Store hinterlegt. Nicht-Mitglieder bekommen eine klare Zugriff-Verweigert-Anzeige und sehen keine Daten.

Implementation: `GET /api/groups/{gateGroupId}/members/{personId}` — 200 = Mitglied, 404 = nicht. Die `personId` kommt aus `GET /api/whoami`.

#### Acceptance Criteria

- **GIVEN** der Nutzer ist Mitglied der konfigurierten Hauptstamm-Gruppe
  **WHEN** er die Extension öffnet
  **THEN** der Gate-Check ist erfolgreich und das Dashboard wird gerendert.

- **GIVEN** der Nutzer ist NICHT Mitglied der konfigurierten Hauptstamm-Gruppe
  **WHEN** er die Extension öffnet
  **THEN** wird ihm eine Zugriff-Verweigert-Meldung in deutscher Sprache angezeigt und KEINE Organigramm-Daten geladen.

- **GIVEN** der Gate-Check ist erfolgreich
  **WHEN** das Dashboard rendert
  **THEN** wird der vollständige Name des angemeldeten Nutzers nicht zwingend angezeigt, aber sein Identitätsstatus ist intern bekannt.

- **GIVEN** im KV-Store ist keine Hauptstamm-Gruppe konfiguriert (Erstinstallation oder Konfiguration zurückgesetzt)
  **WHEN** die Extension startet
  **THEN** wird eine Meldung angezeigt: "Bitte zuerst die Hauptstamm-Gruppe unter Admin → Extensions konfigurieren." Es wird KEIN Gate-Check und KEIN Datenladen versucht.

- **GIVEN** im KV-Store ist eine Hauptstamm-Gruppen-ID hinterlegt, die in ChurchTools nicht (mehr) existiert
  **WHEN** die Extension startet
  **THEN** wird eine technische Fehlermeldung angezeigt, die den Admin darauf hinweist, die Konfiguration zu prüfen.

- **GIVEN** die Extension wird in das ChurchTools-Hauptmenü eingebunden
  **WHEN** ein berechtigter Nutzer das Menü ansieht
  **THEN** erscheint die Extension unter dem Anzeigenamen "RR Mitarbeiter-Dashboard" (NICHT unter dem internen Modul-Key) mit dem Default-Icon des Extension-Systems.

- **GIVEN** der Nutzer ist Mitglied der Hauptstamm-Gruppe, hat aber in keinem Teilstamm oder Team eine Leiter-Rolle
  **WHEN** das Dashboard rendert
  **THEN** sieht er das volle Dashboard. Bereiche, für die seine ChurchTools-Berechtigungen nicht ausreichen, erscheinen als "?"-Boxen (siehe US-5). Es gibt KEINEN gesonderten Banner oder reduzierte Ansicht für diesen Fall.

#### Edge Cases

- Der Nutzer war bis vor kurzem Mitglied, wurde aber gerade entfernt, und seine Session ist noch aktiv → Gate verweigert korrekt den Zugriff (404 vom Membership-Endpunkt).
- API liefert beim Gate-Check einen Fehler ungleich 404 (5xx, Netz, 403) → Es wird eine technische Fehlermeldung angezeigt, KEIN Auto-Pass. (403 unterscheidet sich semantisch von 404, wird aber im Endeffekt gleich als "kein Zugriff" behandelt.)
- Der Nutzer ist gar nicht authentifiziert → ChurchTools redirected ihn üblicherweise zum Login; die Extension muss damit nicht selbst umgehen.

#### Non-Goals

- Diese Story implementiert KEINE Rollen-Differenzierung innerhalb der Hauptstamm-Gruppe (Leiter vs. Mitglied) für Zugriffszwecke. Alle Mitglieder haben gleichen Zugriff auf das Dashboard.
- Die Story implementiert KEINEN serverseitigen Schutz — der Gate ist eine UX-Maßnahme. Datenschutz wird durch ChurchTools' API-Berechtigungen erbracht.

#### Abhängigkeiten

- US-2 (Hauptstamm-Gruppe muss konfiguriert sein, sonst läuft der Gate-Check ins Leere).

---

### US-2: Admin wählt Hauptstamm-Gruppe

**Priorität:** P0
**Story:** Als ChurchTools-Admin möchte ich einmalig festlegen können, welche Gruppe in unserer Installation der Hauptstamm ist, damit die Extension Gate-Check und Hierarchie korrekt verankert.

#### Beschreibung

Über den Admin-Extension-Point der Extension (erreichbar unter Admin → Extensions → Extension Settings) öffnet sich ein Konfigurationsbildschirm. Dort wählt der Admin aus einer Dropdown-/Auswahlliste der in der Installation sichtbaren Gruppen genau eine Gruppe als "Hauptstamm" aus. Die ausgewählte Group-ID wird im KV-Store der Extension persistiert. Zur Laufzeit liest die Extension diese ID, prüft mit ihr den Gate (US-1) und leitet daraus die gesamte Hierarchie ab (Children = Teilstämme, deren Children = Teams).

**Warum nur eine Group-ID, keine Rollen-Konfiguration?** ChurchTools liefert auf jeder Rolle bereits ein `isLeader: boolean`-Flag und im `memberStatistics`-Include eine vorberechnete `leaders`/`participants`-Aufteilung. Eine separate Admin-Konfiguration der Leiter-Rollen-IDs wäre redundant; die Extension respektiert die bestehende ChurchTools-Klassifizierung.

#### Acceptance Criteria

- **GIVEN** der Admin öffnet den Konfigurationsbildschirm zum ersten Mal
  **WHEN** der Bildschirm rendert
  **THEN** wird eine Auswahlliste aller für ihn sichtbaren Gruppen angezeigt, und es ist keine Gruppe vorausgewählt. Die Liste zeigt mindestens den Gruppennamen; optional sortierbar oder filterbar.

- **GIVEN** der Admin wählt eine Gruppe aus und klickt "Speichern"
  **WHEN** der Speichervorgang abgeschlossen ist
  **THEN** wird die Group-ID im KV-Store unter `settings.gateGroupId` als Zahl persistiert, und der Admin sieht eine Erfolgsmeldung.

- **GIVEN** der Admin öffnet den Konfigurationsbildschirm erneut
  **WHEN** der Bildschirm rendert
  **THEN** ist die zuvor gespeicherte Gruppe als ausgewählt markiert.

- **GIVEN** der Admin ändert die Auswahl auf eine andere Gruppe und speichert
  **WHEN** der Speichervorgang abgeschlossen ist
  **THEN** wird die neue ID im KV-Store gespeichert, und das Dashboard zeigt beim nächsten Aufruf den Organigramm-Inhalt der neuen Hauptstamm-Gruppe.

#### Edge Cases

- KV-Store-Schreibvorgang schlägt fehl → Fehlermeldung, Auswahl bleibt im UI sichtbar, damit der Admin nochmal speichern kann.
- Die zuvor gespeicherte Gruppe wurde in ChurchTools gelöscht → Der Konfigurationsbildschirm zeigt sie als "(nicht mehr vorhanden, ID: 42)" im aktuellen Auswahl-Zustand und zwingt den Admin, eine andere Gruppe auszuwählen, bevor "Speichern" funktioniert.
- Der Admin hat keine View-Permission auf die zuvor gewählte Gruppe → identisch zum Lösch-Fall.

#### Non-Goals

- Diese Story zeigt KEINE Vorschau, wie das Dashboard mit der gewählten Gruppe aussehen würde.
- Es gibt KEINE automatische Erkennung anhand des Gruppennamens — der Admin wählt bewusst.
- Es gibt KEINE Konfiguration, welche Rollen als "Leiter" zählen — das übernimmt ChurchTools' `isLeader`-Flag.
- Es gibt KEINE Versionierung oder Historie der Konfigurationsänderungen.

#### KV-Store-Schema

```ts
// CustomDataCategory.shorty = 'settings'
// CustomDataValue.value = JSON.stringify({ gateGroupId: number })
type Settings = {
    gateGroupId: number;
};
```

#### Abhängigkeiten

- KV-Store-Helper aus dem Boilerplate (`getOrCreateModule`, `createCustomDataCategory`, `createCustomDataValue`, `updateCustomDataValue`).
- `GET /api/groups?limit=200` für die Auswahlliste.

---

### US-3: Organigramm wird gerendert

**Priorität:** P0
**Story:** Als Mitarbeiter (Mitglied der Hauptstamm-Gruppe) möchte ich beim Öffnen der Extension das vollständige Organigramm meines Stamms sehen, damit ich auf einen Blick die Mitarbeiterstruktur überblicken kann.

#### Beschreibung

Nach erfolgreichem Gate-Check (US-1) und vorhandener Konfiguration (US-2) wird das Organigramm in drei Ebenen dargestellt: Hauptstamm-Box ganz oben, eine Box pro direktem Kind des Hauptstamms ("Teilstamm"), eine Box pro Kind eines Teilstamms ("Team"). Die Anzahl der Teilstämme und Teams ist NICHT hartkodiert — sie ergibt sich aus den `GET /api/groups/{id}/children`-Aufrufen.

Auf jeder Box werden die Leiter mit vollem Vor- und Nachnamen angezeigt. Auf Hauptstamm- und Teilstamm-Boxen werden zusätzlich aufsummierte Leiter- und Mitgliederzahlen aus den darunterliegenden Teams ausgewiesen — entweder berechnet aus `memberStatistics` der Children oder aus eigener Aggregation der Member-Listen. Auf Team-Boxen wird die Mitgliederzahl angezeigt.

Leiter-Klassifizierung läuft über die `isLeader: boolean`-Flag der Rolle (eingebettet in `group.roles[]`). Mitglieder-Namen kommen aus `member.person.title` bzw. `member.person.domainAttributes.firstName/lastName`; Initialen aus `member.person.initials`.

#### Acceptance Criteria

- **GIVEN** der Gate-Check ist erfolgreich, die Konfiguration ist vorhanden, und alle API-Aufrufe sind erfolgreich
  **WHEN** das Dashboard rendert
  **THEN** wird die Hauptstamm-Box mit Namen aller Personen, die in der Hauptstamm-Gruppe eine Rolle mit `isLeader=true` haben, sowie aufsummierten Leiter-/Mitgliederzahlen aus allen Teams angezeigt.

- **GIVEN** dieselbe Vorbedingung
  **WHEN** das Dashboard rendert
  **THEN** wird unter der Hauptstamm-Box für jedes direkte Kind der Hauptstamm-Gruppe ("Teilstamm") eine Box mit dem Gruppennamen, den Leitern dieses Teilstamms (Namen) und aufsummierten Zahlen aus seinen Teams angezeigt. Die Anzahl Teilstämme ist datengetrieben; im Zielsystem sind es fünf.

- **GIVEN** dieselbe Vorbedingung
  **WHEN** das Dashboard rendert
  **THEN** wird unter jeder Teilstamm-Box für jedes seiner sichtbaren Teams (= direkte Kinder der Teilstamm-Gruppe) eine Box mit Team-Namen, Team-Leitern (Namen) und Mitgliederzahl angezeigt.

- **GIVEN** ein Teilstamm hat keine sichtbaren Teams
  **WHEN** das Dashboard rendert
  **THEN** wird unter der Teilstamm-Box eine "keine Teams"-Platzhalter-Box angezeigt; der Teilstamm bleibt im Organigramm sichtbar.

- **GIVEN** im KV-Store ist keine Hauptstamm-Gruppe konfiguriert
  **WHEN** das Dashboard rendert
  **THEN** wird statt des Organigramms eine Meldung "Bitte zuerst die Hauptstamm-Gruppe unter Admin → Extensions konfigurieren" angezeigt.

- **GIVEN** das Organigramm ist gerendert
  **WHEN** der Nutzer auf "Aktualisieren" klickt
  **THEN** werden alle Daten neu geladen und das Organigramm rerendered.

- **GIVEN** das Dashboard ist gerendert
  **WHEN** der Header sichtbar ist
  **THEN** wird im Header der Titel "RR Mitarbeiter-Dashboard" sowie ein Aktualitäts-Timestamp im Format "Stand: HH:MM" basierend auf dem Zeitpunkt des letzten erfolgreichen Datenladens angezeigt.

- **GIVEN** das Dashboard ist gerendert
  **WHEN** das Layout zwischen Hauptstamm-Hero-Card und Teilstamm-Reihe rendert
  **THEN** ist eine dezente vertikale Trennlinie (oder ein gleichwertiger visueller Abstandshalter) sichtbar, die die hierarchische Beziehung "Hauptstamm enthält Teilstämme" andeutet.

- **GIVEN** die Hauptstamm-Hero-Card rendert
  **WHEN** Leiter-Personen darauf angezeigt werden
  **THEN** wird pro Leiter ein Initialen-Kreis (zwei Buchstaben aus Vor- und Nachname) zusammen mit dem vollen Namen in einer Pill-förmigen Komponente dargestellt.

#### Edge Cases

- Die Hauptstamm-Gruppe hat keine Children → das Dashboard rendert nur die Hauptstamm-Hero-Card und einen Hinweis "Keine Teilstämme angelegt".
- Ein Teilstamm hat sehr viele Teams (>20) → das Layout muss umbrechen können; horizontales Scrolling oder mehrzeiliges Anordnen ist akzeptabel.
- Eine Person hat in derselben Gruppe mehrere Rollen → sie wird einmal pro Gruppe gezählt. Wenn eine ihrer Rollen `isLeader=true` hat, zählt sie als Leiter. Mehrfachzählung über Teams hinweg (eine Person ist Leiter in zwei Teams) ist okay — das spiegelt die Realität wider.
- Der Hauptstamm hat selbst keine Mitglieder mit Leiter-Rolle → die Hauptstamm-Box zeigt "Keine Leiter eingetragen", die Zahlen werden trotzdem aus den Teams aufsummiert.
- Ein Leiter-Name ist sehr lang (>25 Zeichen) → die Pill umbricht oder wird mit Ellipsis abgeschnitten, ohne das Layout zu sprengen.
- Eine Initiale enthält Umlaute (z. B. Übel) → der Initialen-Kreis zeigt den Großbuchstaben mit Umlaut korrekt an. (`member.person.initials` aus der API ist die kanonische Quelle.)

#### Non-Goals

- Diese Story zeigt KEINE Detailansicht oder Drill-down auf Mitgliederebene.
- Die Story rendert das Organigramm in einer einzigen Ansicht — KEINE Zoom-, Reorder- oder Pin-Funktionen.
- KEINE visuelle Hervorhebung von "kritisch unterbesetzt" — die Zahlen werden neutral angezeigt, die Bewertung obliegt dem Nutzer.

#### Abhängigkeiten

- US-1 (Gate-Check muss vorab erfolgreich sein)
- US-2 (Konfiguration muss vorab existieren)

---

### US-4: Skeleton-Loading-Zustand

**Priorität:** P0
**Story:** Als Mitarbeiter möchte ich beim Aufruf der Extension sofort die Layout-Struktur des Organigramms sehen, damit ich verstehe was lädt und keinen leeren Bildschirm betrachte.

#### Beschreibung

Während die Daten geladen werden, zeigt die Extension den vollständigen Aufbau des Organigramms als grafisches Skeleton (Boxen mit grauen Platzhaltern für Texte und Zahlen). Sobald alle Daten geladen sind, ersetzt die echte Inhaltsansicht das Skeleton in einem einzigen Übergang.

#### Acceptance Criteria

- **GIVEN** der Gate-Check ist erfolgreich und der Nutzer hat eine gültige Konfiguration
  **WHEN** das Dashboard mit dem Datenladen beginnt
  **THEN** wird sofort das Skeleton-Layout des Organigramms (Hauptstamm-Box, fünf Teilstamm-Boxen, geschätzte Anzahl Team-Boxen) mit grauen Platzhaltern angezeigt.

- **GIVEN** das Skeleton wird angezeigt
  **WHEN** alle API-Aufrufe abgeschlossen sind
  **THEN** wird das Skeleton in einem einzigen Render-Schritt durch die echten Inhalte ersetzt.

- **GIVEN** das Laden dauert ungewöhnlich lange (>10 Sekunden)
  **WHEN** noch nicht alle Daten geladen sind
  **THEN** bleibt das Skeleton sichtbar; es erscheint KEINE zusätzliche "Lädt noch..."-Meldung.

#### Edge Cases

- Das initiale Laden der Hierarchie (welche Teilstämme und Teams existieren) ist noch nicht abgeschlossen → das Skeleton zeigt eine generische Anzahl Teilstamm-Boxen (5) und eine konservative Schätzung von Team-Boxen pro Teilstamm. Sobald die Hierarchie bekannt ist, passt sich das Skeleton an die echte Struktur an.
- Der Nutzer wechselt während des Ladens den Tab oder verlässt die Seite → kein Sonderverhalten, der nächste Besuch lädt erneut.

#### Non-Goals

- Diese Story zeigt KEIN progressives Rendering einzelner Boxen — alle Boxen erscheinen gleichzeitig, sobald alle Daten da sind.
- KEINE Animation der Skeleton-Übergänge in v1 (Fade etc. sind optional und nicht Teil der Acceptance Criteria).

#### Abhängigkeiten

- US-3 (Organigramm-Render muss existieren, bevor das Skeleton es ersetzen kann).

---

### US-5: Fehlerbehandlung bei einzelnen API-Fehlern

**Priorität:** P0
**Story:** Als Mitarbeiter möchte ich, dass das Dashboard auch dann nutzbar bleibt, wenn einzelne Team-Daten nicht geladen werden können, damit ich nicht durch eine einzelne fehlerhafte Gruppe vom kompletten Überblick abgehalten werde.

#### Beschreibung

Während des parallelen Ladens aller Team-Mitgliederdaten kann es vorkommen, dass einzelne Aufrufe fehlschlagen (403, 500, Timeout, Netzwerk). Statt das gesamte Dashboard zu blockieren, rendert die Extension die erfolgreich geladenen Boxen normal und zeigt für fehlgeschlagene Boxen einen Platzhalter "?" für Leiter und Zahlen. Eine einmalige Toast-Meldung am oberen Rand informiert den Nutzer, dass Teile der Daten nicht geladen werden konnten.

#### Acceptance Criteria

- **GIVEN** mindestens ein Team-Mitglieder-Aufruf schlägt fehl, andere sind erfolgreich
  **WHEN** das Dashboard rendert
  **THEN** wird für jedes fehlgeschlagene Team eine Box mit "?" anstelle der Leiter-Namen und der Mitgliederzahl angezeigt; alle erfolgreichen Boxen rendern normal.

- **GIVEN** mindestens ein Aufruf ist fehlgeschlagen
  **WHEN** das Dashboard fertig gerendert ist
  **THEN** erscheint EIN Toast oben rechts mit dem Text "Einige Daten konnten nicht geladen werden", der vom Nutzer geschlossen werden muss (sticky).

- **GIVEN** alle Aufrufe sind erfolgreich
  **WHEN** das Dashboard fertig gerendert ist
  **THEN** wird KEIN Fehler-Toast angezeigt.

- **GIVEN** ein Teilstamm-Aufruf (Hierarchie-Ebene) schlägt fehl, sodass die Teams dieses Teilstamms gar nicht entdeckt werden
  **WHEN** das Dashboard rendert
  **THEN** wird die Teilstamm-Box mit "?" für Leiter und Zahlen angezeigt; statt Team-Boxen erscheint ein Hinweis "Teams konnten nicht geladen werden". Der Toast aus AC#2 wird ausgelöst.

- **GIVEN** der Hauptstamm-Aufruf selbst schlägt fehl
  **WHEN** das Dashboard rendert
  **THEN** wird die Hauptstamm-Box mit "?" für Leiter und Zahlen angezeigt; das restliche Organigramm versucht weiterhin zu laden. Toast wird ausgelöst.

#### Edge Cases

- Alle Aufrufe schlagen fehl (Server komplett offline) → das gesamte Organigramm zeigt "?" auf jeder Box; ein einziger Toast erscheint. Es gibt KEINEN globalen Block-Bildschirm mit Retry-Button — der Nutzer benutzt den manuellen Refresh-Button aus US-3.
- Ein Aufruf timeoutet erst nach langer Zeit → das Dashboard wartet maximal 30 Sekunden pro Aufruf, danach gilt der Aufruf als fehlgeschlagen und die Box wird mit "?" gerendert.
- Der gleiche Aufruf schlägt zweimal hintereinander fehl (manueller Refresh) → das Verhalten ist identisch; der Toast erscheint erneut.

#### Non-Goals

- Diese Story implementiert KEIN automatisches Retry mit Backoff. Der Nutzer triggert Retry manuell über den Refresh-Button.
- KEIN Detail-Logging ins UI — der spezifische HTTP-Fehlercode wird in v1 nicht angezeigt; nur der generische Toast-Text.
- KEINE Möglichkeit, eine einzelne Box gezielt nachzuladen — Refresh wirkt immer auf das gesamte Dashboard.

#### Abhängigkeiten

- US-3 (Organigramm-Render muss existieren).
- US-4 (Skeleton wird durch Mischung aus echten und "?"-Boxen ersetzt).

---

### US-6: Manueller Refresh

**Priorität:** P1
**Story:** Als Mitarbeiter möchte ich das Organigramm bei Bedarf neu laden können, damit ich aktuelle Daten sehe, nachdem in ChurchTools Änderungen vorgenommen wurden.

#### Beschreibung

Im Header des Dashboards gibt es einen "Aktualisieren"-Button, der alle Daten neu lädt. Während des Reloads erscheint erneut der Skeleton-Zustand. Der Button ist während eines laufenden Reloads deaktiviert.

#### Acceptance Criteria

- **GIVEN** das Organigramm ist vollständig gerendert
  **WHEN** der Nutzer auf "Aktualisieren" klickt
  **THEN** wird das Skeleton-Layout erneut angezeigt und alle API-Aufrufe werden erneut gestartet.

- **GIVEN** ein Refresh läuft
  **WHEN** der Nutzer erneut auf den Button klickt
  **THEN** passiert nichts (Button ist deaktiviert).

- **GIVEN** der Refresh ist abgeschlossen
  **WHEN** das Dashboard fertig gerendert ist
  **THEN** ist der Button wieder aktivierbar.

#### Edge Cases

- Refresh wird gestartet, während die Konfiguration im Hintergrund gelöscht wurde → das Dashboard zeigt nach dem Reload die "Konfiguration fehlt"-Meldung aus US-3.
- Refresh wird mit gleichzeitig geöffnetem Admin-Panel ausgelöst → keine Sonderbehandlung; die zwei Bereiche sind unabhängig.

#### Non-Goals

- KEIN Auto-Refresh in regelmäßigen Abständen.
- KEINE relative Zeitanzeige ("vor 5 Minuten") — der Timestamp im Header (siehe US-3) zeigt die Uhrzeit des letzten Ladens absolut im Format "Stand: HH:MM".

#### Abhängigkeiten

- US-3 (Render muss existieren).

---

### US-7: Layout-Verhalten auf verschiedenen Bildschirmgrößen

**Priorität:** P1
**Story:** Als Mitarbeiter möchte ich das Dashboard sowohl am Desktop als auch auf dem Smartphone nutzen können, damit ich auch unterwegs (z. B. am Sonntag) Zugriff habe.

#### Beschreibung

Das Organigramm passt sich an die Bildschirmbreite an. Auf Desktop-Bildschirmen werden die fünf Teilstamm-Boxen nebeneinander angeordnet, jede mit ihren Team-Chips eingebettet. Auf schmalen Bildschirmen (Mobile) werden die Teilstamm-Boxen untereinander gestapelt, und die einzelnen Team-Details werden zu einer Summary-Zeile pro Teilstamm zusammengefasst, um die Lesbarkeit zu erhalten.

#### Acceptance Criteria

- **GIVEN** das Dashboard wird auf einem Bildschirm mit Breite ≥ 1024px geöffnet
  **WHEN** das Layout rendert
  **THEN** werden die fünf Teilstamm-Boxen nebeneinander angeordnet, mit allen ihren Team-Chips (Team-Name, Leiter-Namen, Leiter-/Mitglieder-Zahlen) innerhalb der jeweiligen Teilstamm-Box vollständig sichtbar.

- **GIVEN** das Dashboard wird auf einem Bildschirm mit Breite < 768px geöffnet
  **WHEN** das Layout rendert
  **THEN** werden die Teilstamm-Boxen untereinander gestapelt, und pro Teilstamm wird statt einzelner Team-Chips eine zusammengefasste Zeile angezeigt: Teilstamm-Leiter-Namen plus Anzahl Teams (z. B. "Dora Fischer, Eli Hartmann · 3 Teams"). Die aggregierten Leiter-/Mitgliedszahlen bleiben erhalten.

- **GIVEN** das Dashboard wird auf einem Bildschirm zwischen 768px und 1024px geöffnet
  **WHEN** das Layout rendert
  **THEN** ist eine Zwischendarstellung akzeptabel (z. B. zwei oder drei Teilstämme pro Zeile mit voller Team-Detailanzeige), solange die Hierarchie eindeutig bleibt.

- **GIVEN** das Dashboard rendert auf einem mobilen Gerät
  **WHEN** der Hauptstamm-Hero-Card sichtbar ist
  **THEN** werden die Stat-Kacheln (Leiter-Anzahl, Mitglieder-Anzahl) in einer Zeile angezeigt, gefolgt von den Hauptstamm-Leitern als kommaseparierte Textzeile (statt Pill-Komponenten), um Platz zu sparen.

#### Edge Cases

- Sehr lange Personennamen → werden umgebrochen oder mit Ellipsis dargestellt, sprengen aber nicht das Layout.
- Sehr viele Teams in einem Teilstamm (>15) auf Desktop → akzeptabel ist horizontales Scrolling innerhalb der Teilstamm-Sektion oder mehrzeiliges Umbrechen.
- Bildschirm wird während der Nutzung gedreht (Portrait → Landscape) → das Layout reflowed automatisch zur passenden Breakpoint-Variante.

#### Non-Goals

- KEINE separate native App. Mobile-Nutzung erfolgt im Browser über die ChurchTools-App.
- KEIN spezielles Touch-Gestik-Handling (Swipe, Pinch-to-Zoom).
- KEINE Tap-to-Expand-Funktion auf Mobile, um die zusammengefassten Team-Chips wieder aufzuklappen — das ist v1.1.

#### Abhängigkeiten

- US-3 (Organigramm muss existieren).

---

### US-8: CSS-Scoping (technische Story)

**Priorität:** P0
**Story:** Als ChurchTools-Admin möchte ich, dass die Extension keine Stile in das umgebende ChurchTools-UI leakt und umgekehrt nicht durch ChurchTools-Stile zerstört wird, damit die Host-Anwendung stabil bleibt.

#### Beschreibung

Alle CSS-Selektoren der Extension sind unter einer eindeutigen Wurzel-Klasse (z. B. `.rr-dashboard-root`) verschachtelt. Das `<body>`-Element wird nicht stilisiert. Modale Dialoge und Toasts, die ggf. außerhalb des Container-Roots gerendert werden, haben Fallback-Selektoren mit hoher Spezifität.

#### Acceptance Criteria

- **GIVEN** die Extension ist installiert
  **WHEN** ein Nutzer das Dashboard öffnet und anschließend zu einem anderen ChurchTools-Modul wechselt
  **THEN** sind keine CSS-Stile der Extension im anderen Modul sichtbar.

- **GIVEN** das Dashboard ist gerendert
  **WHEN** ChurchTools-Hosts-Stile geladen sind
  **THEN** rendert das Dashboard visuell wie geplant — Schriften, Abstände, Farben sind nicht durch Host-Stile verfälscht.

- **GIVEN** ein Toast wird ggf. außerhalb des Extension-Containers gerendert
  **WHEN** der Toast angezeigt wird
  **THEN** ist sein Styling über Fallback-Selektoren weiterhin korrekt.

#### Edge Cases

- ChurchTools strippt Klassennamen aus der Extension (z. B. bei Sanitization) → über `[data-ct-extension="rr-dashboard"]`-Attribut-Fallbacks bleiben Stile erhalten.
- Eine zukünftige ChurchTools-Version ändert globale CSS-Variablen → die Extension verwendet eigene CSS-Variablen, die unabhängig vom Host sind.

#### Non-Goals

- KEINE Theme-Anpassung an Light/Dark-Modi des Hosts in v1.
- KEIN dediziertes Component-Library-System — Vanilla CSS reicht.

#### Abhängigkeiten

- Keine.

---

### US-9: Visuelles Layout-System (Designentwurf v0.2)

**Priorität:** P0
**Story:** Als Mitarbeiter möchte ich, dass sich das Dashboard visuell wie ein natürlicher Teil von ChurchTools anfühlt, damit ich es ohne Umgewöhnung nutzen kann.

#### Beschreibung

Das Dashboard implementiert das visuelle System, das im Designentwurf v0.2 spezifiziert ist: nested Cards in einer monochromen, ChurchTools-konformen Palette mit klar definierten Komponenten für Hauptstamm-Hero-Card, Teilstamm-Karten, Team-Chips und Stat-Kacheln. Hierarchie wird durch räumliche Verschachtelung und einen einzelnen Divider zwischen den Ebenen vermittelt, NICHT durch gezeichnete Verbindungslinien.

#### Acceptance Criteria

- **GIVEN** die Hauptstamm-Hero-Card rendert
  **WHEN** sie mit Daten gefüllt ist
  **THEN** zeigt sie links den Subtitel "HAUPTSTAMM", den Hauptstamm-Namen, das Label "Leiter" und die Leiter als Pills mit Initialen-Kreis; rechts zwei nebeneinander stehende Stat-Kacheln (Leiter-Anzahl, Mitglieder-Anzahl) mit gleicher Höhe und Breite.

- **GIVEN** eine Teilstamm-Karte rendert
  **WHEN** sie mit Daten gefüllt ist
  **THEN** ist sie vertikal aufgebaut in dieser Reihenfolge: Subtitel "TEILSTAMM" + Teilstamm-Name, Leiter-Liste, Stat-Zeile mit aggregierten Zahlen, Subtitel "TEAMS" und Team-Chip-Liste — getrennt durch dünne Trennlinien.

- **GIVEN** ein Team-Chip rendert
  **WHEN** er innerhalb einer Teilstamm-Karte angezeigt wird
  **THEN** zeigt er den Team-Namen links, "{n}L · {m}M" rechts in derselben Zeile, und die Leiter-Namen als kommaseparierte Zeile in kleinerer Schrift darunter — alles auf einem leicht gefärbten Sekundärflächen-Hintergrund.

- **GIVEN** das gesamte Dashboard rendert
  **WHEN** alle Karten sichtbar sind
  **THEN** verwenden alle Karten dieselben Werte für Border-Radius, Border-Stärke (0,5px), Padding-Schritte und Schriftgrößen-Hierarchie, sodass das Layout visuell konsistent wirkt.

- **GIVEN** die Hauptstamm-Hero-Card und die Teilstamm-Karten rendern
  **WHEN** sie nebeneinander sichtbar sind
  **THEN** hat die Hauptstamm-Hero-Card einen leicht abgesetzten Hintergrund (z. B. `var(--color-background-secondary)`), während die Teilstamm-Karten auf der Standard-Surface (`var(--color-background-primary)`) sitzen — der Unterschied ist subtil, aber sichtbar.

- **GIVEN** die Extension rendert in einer ChurchTools-Installation mit Dark-Mode-Unterstützung
  **WHEN** der Host-Dark-Mode aktiv ist
  **THEN** passen sich Hintergrundfarben, Textfarben und Border-Farben so an, dass alle Inhalte lesbar bleiben (Mindest-Kontrast WCAG AA).

#### Edge Cases

- Eine Hauptstamm-Hero-Card mit sehr vielen Leitern (>6) → die Pills brechen mehrzeilig um, die Stat-Kacheln rechts behalten ihre Position.
- Ein Teilstamm-Name ist sehr lang (>20 Zeichen) → der Name umbricht innerhalb der Karte; die Karten in der Reihe bleiben gleich hoch.
- Ein Team-Chip hat sehr viele Leiter (>4 Namen) → die Leiter-Zeile umbricht innerhalb des Chips.

#### Non-Goals

- KEINE individuelle Akzentfarbe pro Teilstamm.
- KEINE gezeichneten Verbindungslinien zwischen Hauptstamm und Teilstämmen oder zwischen Teilstamm und Teams (außer dem einen vertikalen Divider zwischen Hauptstamm und Teilstamm-Reihe).
- KEINE Profilfotos der Personen — nur Initialen-Kreise auf der Hauptstamm-Ebene.
- KEINE Hover-Animationen auf Karten oder Chips in v1.

#### Abhängigkeiten

- US-3 (Organigramm-Daten und Strukturen müssen existieren).
- US-8 (CSS-Scoping muss zuerst etabliert sein, damit das visuelle System nicht in den Host leakt).

## Non-Functional Requirements

- **Performance:** Initiales Rendering des Skeletons in unter 200ms nach Aufruf der Extension. Vollständiges Rendering (alle echten Daten) in unter 5 Sekunden bei einer Mitarbeiterstamm-Größe von ca. 30 Teams insgesamt.
- **Reliability:** Einzelne API-Fehler dürfen das Dashboard nicht komplett blockieren (siehe US-5). Pro Aufruf wird ein Timeout von 30 Sekunden angesetzt.
- **Security:** Keine Speicherung von API-Tokens, Passwörtern oder Service-Credentials im Browser. Die Extension nutzt ausschließlich die Session des angemeldeten Nutzers.
- **Compatibility:** Lauffähig in den letzten zwei Major-Versionen von Chrome, Firefox, Safari und Edge sowie in der ChurchTools-App auf iOS und Android.
- **Usability:** Lesbar bei Browserzoom 100% und 150%. Tastaturnavigation für interaktive Elemente (Refresh-Button, Toast-Schließen) muss funktionieren.
- **Internationalisierung:** Alle UI-Texte in v1 ausschließlich auf Deutsch. Texte sind in der Codebase zentralisiert (Konstanten oder Locale-File), um spätere Übersetzung zu erleichtern.
- **Observability:** Im Browser-Developer-Console werden Fehlerantworten von API-Aufrufen mit `console.error` geloggt. Es werden KEINE Telemetrie-Daten an externe Services gesendet.

## Dependencies & Risks

**Dependencies:**

- ChurchTools-Installation mit aktiviertem Group-Hierarchy-Feature.
- Eine bestehende Gruppen-Hierarchie mit einem als Hauptstamm geeigneten Knoten, dessen direkte Children die "Teilstämme" und deren direkte Children die "Teams" abbilden. Die konkreten Namen sind beliebig — die Extension liest sie zur Laufzeit aus.
- Berechtigungssetup: Leiter aller Teilstämme haben in ChurchTools bereits View-Rechte auf alle anderen Teilstämme und deren Teams (bestehende Konfiguration der Installation).
- ChurchTools-Extension-System (Closed Beta) ist auf der Ziel-Installation freigeschaltet.
- `@churchtools/extension-points` für Type-Definitionen.
- `@churchtools/churchtools-client` für API-Aufrufe.
- KV-Store-Endpunkte (`/custommodules/...`) sind funktionsfähig.

**Entwicklungs- und Test-Umgebung:**

- Test-Instanz: `https://rr-demo.church.tools` — wird für Entwicklung und Smoke-Tests verwendet. Auf der Instanz existiert (Stand 2026-05-05) eine geeignete RR-Hierarchie mit Hauptstamm-Gruppe `id=15` ("RR Gesamt-Stammleitung"), fünf Teilstämmen und 11 Teams.
- Pre-Implementation Recon (siehe eigene Section unten) wurde gegen `rr-demo.church.tools` durchgeführt; alle Punkte sind beantwortet.
- `.env`-Template-Werte für die Entwicklung (nur lokales Dev-Server-Setup; `.env` wird nicht in den Release-Build aufgenommen):
    - `VITE_BASE_URL=https://rr-demo.church.tools`
    - `VITE_KEY=rr-dashboard` (oder eindeutiger Suffix bei geteilter Demo-Nutzung, z. B. `rr-dashboard-{initialen}`, um Kollisionen im KV-Store zu vermeiden)
    - `VITE_USERNAME` und `VITE_PASSWORD` für Auto-Login im Dev-Server (vom Boilerplate verwendet, nur in `import.meta.env.MODE === 'development'`).
- Die Hauptstamm-Group-ID gehört bewusst NICHT in `.env`. Sie wird zur Laufzeit per Admin-Konfig (US-2) im KV-Store unter `settings.gateGroupId` persistiert. Damit ist derselbe ZIP-Build auf beliebigen Installationen einsetzbar.
- Achtung Demo-Resets: Demo-Instanzen können geplante Resets durchlaufen. KV-Store-Einträge (`/custommodules/...`) gehen dabei verloren — kein Fehler im Code, nur Demo-Verhalten.

**Distribution:**

- Veröffentlichung als Public GitHub Repository, sodass andere Gemeinden die Extension forken und an ihre eigene Struktur anpassen können.
- Lizenz: MIT (Empfehlung) — bestätigt Open-Source-Charakter und erlaubt Forks ohne juristischen Aufwand.
- Releases als getaggte Versionen mit gepacktem ZIP im Release-Asset, damit Admins nicht selbst bauen müssen.
- README im Repo enthält: Installations-Anleitung für Endnutzer (ZIP-Upload + einmalige Auswahl der Hauptstamm-Gruppe in den Extension-Settings), Build-Anleitung für Entwickler. **Keine** Anleitung zum Anpassen hartkodierter Gruppennamen nötig — solche existieren in v1 nicht (alle Namen werden zur Laufzeit aus der Hierarchie gelesen).

**Risks:**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ChurchTools-Extension-System ändert API-Shape vor GA | Medium | High | Versionen von `@churchtools/extension-points` pinnen; bei Updates Smoke-Test durchspielen. |
| Group-Hierarchy-Endpoint hat in der Ziel-Version unerwartete Shape | Medium | Medium | `loadHierarchy()` als isolierte Adapter-Funktion bauen, sodass sie an die tatsächliche Endpoint-Form angepasst werden kann. |
| Berechtigungen ändern sich (ein Teilstamm-Leiter sieht plötzlich nicht mehr alle Teilstämme) | Low | High | Fehlerbehandlung aus US-5 deckt den Fall ab; betroffene Boxen erscheinen als "?". |
| Performance bricht ein bei sehr großen Stämmen (>50 Teams) | Low | Medium | Caching im KV-Store nachrüsten (Out-of-Scope für v1). |
| CSS-Leakage in zukünftige ChurchTools-Versionen | Medium | Medium | US-8 (CSS-Scoping) konsequent umsetzen; bei Major-Updates des Hosts visuellen Smoke-Test durchspielen. |
| Rollennamen oder -IDs ändern sich nach Konfiguration | Low | Low | US-2 erlaubt Re-Konfiguration jederzeit; das Dashboard zeigt bei fehlender Konfiguration einen klaren Hinweis. |
| Ein Mitglied der Hauptstamm-Gruppe ohne Leiter-Rolle in einem Teilstamm sieht andere Teilstämme nicht | Medium | Low | Akzeptierte Einschränkung; betroffene Boxen erscheinen als "?" (US-5). |

## Pre-Implementation Recon

Recon wurde am 2026-05-05 gegen `https://rr-demo.church.tools` durchgeführt. Alle sieben Punkte sind beantwortet; die Ergebnisse sind unten festgehalten und in die jeweiligen User Stories und in die Dependencies-Section migriert.

- [x] **Recon-1: Extension-System aktiv?** ✅ `GET /api/custommodules` antwortet 200 mit `{"data":[],"meta":{"count":0}}` — Endpunkt existiert, noch keine Module registriert. Closed-Beta-Anfrage nicht nötig.

- [x] **Recon-2: Group-Hierarchy-Endpoint-Shape.** ✅ Verwende `GET /api/groups/{id}/children` (und `/parents`). Antwort-Items sind **Domain-Objekte**, nicht volle `Group`-Objekte: `{ title, domainIdentifier (string!), apiUrl, frontendUrl, domainAttributes: { groupTypeId, ... } }`. Für volle Group-Daten zusätzlich `GET /api/groups/{id}` mit passendem `include[]`. **Nicht funktionierend:** `?parent_ids[]=`, `?person_ids[]=` (snake_case), `include[]=children` (validation error — gültige `include`-Werte sind `hasPermissions, roles, tags, memberStatistics, averageMemberAge, places, publicPostsStatistic, signupCondit...`). Funktionierende Filter: `?ids[]=` auf `/groups`.

- [x] **Recon-3: Hauptstamm-Group-ID.** ✅ Im Demo-System `id=15` ("RR Gesamt-Stammleitung", `groupTypeId=2`/Dienst, 12 Leiter). Wird **nicht** in `.env` eingetragen — wird zur Laufzeit per US-2-Admin-Konfig im KV-Store unter `settings.gateGroupId` gespeichert.

- [x] **Recon-4: Rollen-Feld auf Mitgliedern bestätigt.** ✅ `GroupMember.groupTypeRoleId: number` ist das Feld. Rollen-Namen sind nicht direkt am Member, aber jede Gruppe hat `group.roles[]` mit `{ id, groupTypeRoleId, name, type: 'leader'|'participant', isLeader: boolean }` — Lookup per `groupTypeRoleId`. **Person-Daten** (Vor-/Nachname, Initialen) sind direkt am Member unter `member.person.title` / `member.person.domainAttributes.firstName/lastName` / `member.person.initials` inline — kein separater `/persons/{id}`-Aufruf nötig. Wichtig: `GroupMember.personId` ist `@deprecated`; offizielle Quelle ist `member.person.domainIdentifier` (string).

- [x] **Recon-5: Group Types und Rollen.** ✅ `GET /api/group/grouptypes` (singular `group/grouptypes`, **nicht** `/grouptypes`) liefert in der Demo 4 Typen: 1 Kleingruppe, 2 Dienst, 3 Maßnahme, 4 Merkmal. **Rollen sind nicht am GroupType-Response** — sie leben pro Gruppe in `group.roles[]`. Da ChurchTools auf jeder Rolle `isLeader: boolean` setzt und im `memberStatistics`-Include eine vorberechnete `leaders/participants/total`-Aufteilung liefert, **entfällt der ursprüngliche Bedarf einer Admin-Konfig der Leiter-Rollen-IDs**. US-2 wurde entsprechend auf "Hauptstamm-Gruppe wählen" reduziert.

- [x] **Recon-6: Gate-Membership-Endpoint gewählt.** ✅ **`GET /api/groups/{gateGroupId}/members/{personId}`** — 200 = Mitglied, 404 mit `error.notfound` = nicht. Sehr saubere binäre Antwort, kein Pagination-Scan. **Nicht verwenden:** `/api/persons/{id}/groups` (liefert auch für echte Mitglieder leeres `data`-Array auf dieser Version) und `?personIds[]=`-Filter auf `/members` (wird stillschweigend ignoriert). `personId` aus `GET /api/whoami`.

- [x] **Recon-7: ct-types.d.ts inspiziert.** ✅ Boilerplate liefert vollständige Typdatei (~34.5k Zeilen). Relevante Exports: `CustomModule`, `CustomModuleCreate`, `CustomModuleDataCategory`, `CustomModuleDataCategoryCreate`, `CustomModuleDataValue`, `CustomModuleDataValueCreate`, `Group`, `GroupHierarchy` (`{children: number[], parents: number[], group, groupId}`), `GroupMember` (mit `personId @deprecated`), `Person`. Diese Typen werden direkt importiert; eigene Typen nur dort, wo Domain-spezifische Aggregate (z. B. `OrganigramNode`) gebraucht werden.

## User Flows

### Flow: Erstmalige Nutzung durch einen Mitarbeiter

**Beteiligt:** Stammleiter / Stammwart (Mitglied der Hauptstamm-Gruppe)
**Vorbedingung:** Extension ist installiert; Admin hat Leiter-Rollen konfiguriert (US-2 abgeschlossen).

1. Nutzer öffnet die Extension über das ChurchTools-Hauptmenü.
2. Extension prüft Mitgliedschaft in der konfigurierten Hauptstamm-Gruppe.
3. Mitgliedschaft bestätigt → Skeleton-Layout des Organigramms erscheint sofort.
4. Im Hintergrund laden alle benötigten Daten (Hauptstamm, Teilstämme, Teams, Mitglieder).
5. Nach Abschluss aller Aufrufe wird das vollständige Organigramm in einem Render-Schritt sichtbar.
6. Nutzer überfliegt die Daten und schließt die Extension oder verbleibt darauf.

**Alternative Pfade:**

- Mitgliedschaft nicht bestätigt (Schritt 2): Nutzer sieht eine Zugriff-Verweigert-Meldung; Flow endet.
- Konfiguration fehlt: Nutzer sieht eine Aufforderung, die Extension-Settings durch einen Admin konfigurieren zu lassen; Flow endet.
- Einzelne API-Aufrufe schlagen fehl (Schritt 4): Betroffene Boxen erscheinen als "?", ein Toast informiert den Nutzer.

### Flow: Erstmalige Konfiguration durch einen Admin

**Beteiligt:** ChurchTools-Admin
**Vorbedingung:** Extension ist installiert.

1. Admin öffnet Admin → Extensions → Extension Settings → RR Dashboard.
2. Konfigurationsbildschirm rendert; alle sichtbaren Group Types mit ihren Rollen werden gelistet.
3. Admin wählt für jeden relevanten Group Type die Rolle(n) aus, die als "Leiter" gelten sollen.
4. Admin klickt "Speichern".
5. Auswahl wird im KV-Store persistiert; Erfolgsmeldung erscheint.
6. Admin schließt das Konfigurationsfenster oder bleibt zur Kontrolle.

**Alternative Pfade:**

- Speichern schlägt fehl (Schritt 5): Fehlermeldung wird angezeigt, Auswahl bleibt im UI; Admin kann erneut speichern.
- Admin lässt Auswahl leer und speichert: Konfiguration wird leer persistiert; das Dashboard wird beim nächsten Aufruf eine Konfigurations-Aufforderung zeigen.

### Flow: Dashboard manuell aktualisieren

**Beteiligt:** Stammleiter / Stammwart
**Vorbedingung:** Dashboard ist bereits geöffnet und gerendert.

1. Nutzer klickt auf "Aktualisieren".
2. Refresh-Button wird deaktiviert; Skeleton-Layout erscheint erneut.
3. Daten werden neu geladen.
4. Echtes Organigramm ersetzt das Skeleton; Refresh-Button wird wieder aktivierbar.

**Alternative Pfade:**

- API-Fehler während des Refreshs: Verhalten gemäß US-5 (Boxen mit "?" plus Toast).

## Open Questions / TBDs

Alle ursprünglichen offenen Fragen sind entschieden. Technische API-Annahmen wurden in der Pre-Implementation Recon verifiziert.

- [x] ~~Soll der Aktualitäts-Timestamp im Header angezeigt werden? — Ja, im Format "Stand: HH:MM" (siehe US-3, US-6).~~ (entschieden 2026-05-05 in v0.2)
- [x] ~~Mit oder ohne kategoriale Farbcodierung pro Teilstamm? — Ohne, monochrom (siehe globales Out-of-Scope).~~ (entschieden 2026-05-05 in v0.2)
- [x] ~~Klassisches Organigramm mit Verbindungslinien oder nested Cards? — Nested Cards (siehe globales Out-of-Scope).~~ (entschieden 2026-05-05 in v0.2)
- [x] ~~Eigener Anzeigename und Icon im Hauptmenü? — Anzeigename "RR Mitarbeiter-Dashboard", Default-Icon (siehe US-1).~~ (entschieden 2026-05-05 in v0.3)
- [x] ~~Distribution? — Public GitHub Repository, MIT-Lizenz, getaggte Releases mit ZIP-Asset (siehe Dependencies & Risks > Distribution).~~ (entschieden 2026-05-05 in v0.3)
- [x] ~~Hauptstamm-Hero-Card mit anderem Hintergrund? — Ja, leicht abgesetzte Sekundär-Surface (siehe US-9).~~ (entschieden 2026-05-05 in v0.3)
- [x] ~~Verhalten bei Mitgliedern ohne Leiter-Rolle? — Volles Dashboard, "?"-Boxen wo Berechtigungen fehlen (siehe US-1).~~ (entschieden 2026-05-05 in v0.3)
- [x] ~~Tap-to-Expand auf Mobile? — Gestrichen, Mobile bleibt Summary-only (siehe US-7 Non-Goals).~~ (entschieden 2026-05-05 in v0.3)
- [x] ~~Group-Type-Anzahl in der Demo-Instanz~~ — Recon-5: vier Typen (Kleingruppe, Dienst, Maßnahme, Merkmal). (entschieden 2026-05-05 in v0.4)
- [x] ~~Hardgecodete Teilstamm-Namen vs. dynamische Erkennung~~ — Dynamisch. Teilstamm- und Team-Namen werden zur Laufzeit aus `GET /api/groups/{gateId}/children` (und rekursiv) gelesen; nichts ist im Code hartkodiert. Hauptstamm-Gruppe wird per US-2 im KV-Store gewählt. (entschieden 2026-05-05 in v0.4)

## Future Considerations (v1.1+)

Folgende Ideen sind bewusst aus v1 ausgeschlossen, aber für eine spätere Iteration sinnvoll, sobald Nutzer-Feedback vorliegt. Sie sind KEIN Bestandteil des aktuellen Lieferumfangs und nicht Teil der Acceptance Criteria.

- **Per-Box-Refresh:** Eine einzelne Team-Box gezielt nachladen, ohne das gesamte Dashboard neu zu rendern. Hilfreich, wenn ein einzelner Team-Aufruf in v1 fehlschlägt und der Nutzer nicht alles neu laden möchte.
- **Drill-down auf Mitgliederebene:** Klick auf eine Team-Box öffnet eine Liste der einzelnen Mitglieder mit Namen, Status, ggf. Kontaktdaten — analog zur ChurchTools-Standardansicht, aber im Kontext des Dashboards.
- **CSV-Export oder Druckansicht:** Für Leitungsrunden, in denen Zahlen ausgedruckt oder in Tabellenkalkulationen weiterverarbeitet werden sollen.
- **Historische Daten / Trendanzeige:** Zahlen über Zeit verfolgen, z. B. "Wie hat sich die Mitgliederzahl von Forscher über die letzten 12 Monate entwickelt?".
- **KV-Store-Caching:** 5-Minuten-Cache pro Team mit manueller Invalidierung. Erst implementieren, wenn die Performance ohne Cache spürbar leidet.
- **Visuelle Hervorhebung von Unterbesetzung:** Boxen mit Leiter-Anzahl unter einem Schwellwert farblich kennzeichnen (z. B. Amber bei <2 Leitern). Schwellwerte konfigurierbar im Admin-Panel.
- **Mehrsprachigkeit:** UI-Strings extern auslagern, Englisch als zweite Sprache.
- **Filter und Suche:** Z. B. "zeige nur Teams mit weniger als 10 Mitgliedern" oder Suche nach Team-Name.

**Tap-to-Expand auf Mobile** ist explizit NICHT in dieser Liste — die Entscheidung in v0.3 war, dass Mobile dauerhaft Summary-only bleibt und volle Detailansicht eine Desktop-Aufgabe ist.
