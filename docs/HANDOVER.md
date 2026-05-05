# Handover Note: RR Mitarbeiter-Dashboard Extension

**An:** [Entwickler]
**Von:** [bitte ergänzen]
**Datum:** 2026-05-05
**Status:** Übergabe zur Implementierung

## Was du in der Hand hältst

```
docs/
├── HANDOVER.md          ← dieses Dokument
├── PRD.md               ← Produkt- und Funktions-Spezifikation
├── adr/
│   ├── README.md        ← ADR-Format und -Index
│   ├── 001-frontend-framework.md
│   ├── 002-css-scoping.md
│   ├── 003-testing-strategy.md
│   ├── 004-module-structure.md
│   ├── 005-api-client.md
│   └── 006-linting-and-formatting.md
└── screens/
    ├── screen-1-desktop.png    ← verbindliche Design-Referenz
    ├── screen-2-skeleton.png
    ├── screen-3-mobile.png
    ├── desktop.html            ← HTML-Quellen zum Pixel-Abmessen
    ├── skeleton.html
    └── mobile.html
```

**Wichtige Lese-Hierarchie:**

1. **PRD.md** ist die Source of Truth für *was* zu bauen ist (9 User Stories mit Acceptance Criteria, Stand v0.4).
2. **Die Screens** sind verbindlich für die visuelle Umsetzung. Bei Konflikt zwischen Text-Beschreibung im PRD und Screen gewinnt der Screen.
3. **Die ADRs** sind verbindlich für *wie* gebaut wird. Sechs Architektur-Entscheidungen liegen fest. Wenn du an einem Bereich arbeitest, lies den entsprechenden ADR vorher.

## Pre-Implementation Recon — abgeschlossen

Die "Pre-Implementation Recon" im PRD ist mit v0.4 vollständig durchlaufen (siehe Section "Pre-Implementation Recon" im PRD; alle sieben Punkte sind ✅ mit konkreten Antworten dokumentiert). Wesentliche Konsequenzen, die deine Implementierung sofort betreffen:

- **Hauptstamm-Group-ID** kommt nicht aus `.env`, sondern aus dem KV-Store unter `settings.gateGroupId`. Der Admin setzt sie über US-2 beim Erst-Setup. Im Demo-System ist die ID `15`.
- **Hierarchie:** rekursiver Aufruf von `GET /api/groups/{id}/children`. Antwort-Items sind Domain-Objekte (`title`, `domainIdentifier` als string!), nicht volle `Group`-Objekte.
- **Gate-Check:** `GET /api/groups/{gateGroupId}/members/{personId}` → 200 = Mitglied, 404 = nicht. `personId` aus `GET /api/whoami`.
- **Leiter-Klassifizierung:** kommt direkt von ChurchTools über `role.isLeader: boolean`. Aggregierte Zahlen pro Gruppe lassen sich über `?include[]=memberStatistics` (`{leaders, participants, total}`) abholen, ohne client-seitige Berechnung.
- **Personen-Daten** (Name, Initialen) sind am Member inline (`member.person.title`, `member.person.initials`) — keine separaten `/persons/{id}`-Aufrufe.

## Tech-Stack (verbindlich, dokumentiert in den ADRs)

| Bereich | Entscheidung | ADR |
|---|---|---|
| Boilerplate | `churchtools/extension-boilerplate` (Vite + TypeScript) | — |
| Frontend-Framework | Vue 3 mit Composition API | [001](adr/001-frontend-framework.md) |
| CSS | Vue `<style scoped>` + BEM, alles unter `.rr-dashboard-root` | [002](adr/002-css-scoping.md) |
| Tests | Keine in v1 — TypeScript + ESLint + manuelles Testen reichen vorerst | [003](adr/003-testing-strategy.md) |
| Modul-Struktur | Feature-Folder (`gate/`, `dashboard/`, `admin/`, `shared/`) | [004](adr/004-module-structure.md) |
| API-Client | `@churchtools/churchtools-client` mit dünnem Wrapper in `src/shared/api.ts` | [005](adr/005-api-client.md) |
| Linting/Formatting | ESLint flat config + Prettier + `eslint-plugin-vue`, kein Husky | [006](adr/006-linting-and-formatting.md) |

**Type-Definitionen:** `@churchtools/extension-points` für die Extension-Slot-Typen.

**Enforcement:** Editor-on-save (lint + format) während du schreibst, `npm run check` lokal auf Abruf, GitHub Actions als verbindliches Gate vor Merge. Keine Pre-Commit-Hooks (siehe ADR-006).

## Reihenfolge der Implementierung

1. ~~Pre-Implementation Recon komplett durchlaufen~~ ✅ erledigt (siehe oben).
2. **Repo aufsetzen** auf Basis von `churchtools/extension-boilerplate` ("Use this template" auf GitHub bzw. Files kopieren). Vue 3 einbinden, ESLint flat config + Prettier + `eslint-plugin-vue` einrichten, Feature-Folder-Struktur anlegen.
3. **GitHub Actions:** zwei Workflows (`ci.yml` für jeden PR, `release.yml` für getaggte Releases mit ZIP-Asset). Branch-Protection-Regel: CI muss grün sein vor Merge.
4. **US-8 (CSS-Scoping)** zuerst: alle CSS unter `.rr-dashboard-root`, `<style scoped>` als Default, BEM als Konvention. Wenn das von Anfang an drin ist, ersparst du dir die Karteileichen-Lehrstunde.
5. **US-2 (Admin-Konfig)** — `admin/`-Feature-Folder. **Vor US-1**, weil der Gate-Check ohne `settings.gateGroupId` aus US-2 nichts zu prüfen hat. Bei fehlender Konfig zeigt das Dashboard die "bitte konfigurieren"-Meldung; sobald Admin gespeichert hat, läuft US-1.
6. **US-1 (Gate)** — `gate/`-Feature-Folder. Sobald der Gate steht, kannst du an alles andere unter dieser Bedingung weiterbauen.
7. **US-3 (Organigramm-Render) + US-9 (Visuelles Layout)** — `dashboard/`-Feature-Folder. Zusammen umsetzen, weil US-9 die visuellen ACs für US-3 ist.
8. **US-4 (Skeleton)** — Skeleton-Komponenten in `dashboard/`.
9. **US-5 (Fehlerbehandlung) + US-6 (Refresh)** — die zwei Verhaltens-Stories.
10. **US-7 (Responsive)** — als Schliff am Ende.

## Was bewusst nicht im Lieferumfang ist

Schau in der "Future Considerations (v1.1+)"-Section am Ende des PRDs nach. Dort stehen Features wie Per-Box-Refresh, Drill-down, CSV-Export, Caching, Unterbesetzungs-Highlights — bewusst draußen für v1, damit der Scope nicht ausufert. Wenn dir bei der Implementierung etwas davon „natürlicher mitgenommen" wäre, schreib das in die PR-Description und lass dem Product-Verantwortlichen die Entscheidung.

## Distribution

Die Extension wird als Public GitHub Repository veröffentlicht (MIT-Lizenz, getaggte Releases mit ZIP-Asset). Plane das von Anfang an mit ein:

- README mit Installations-Anleitung für Endnutzer (ZIP herunterladen, in ChurchTools hochladen, einmalig die Hauptstamm-Gruppe in den Extension-Settings auswählen) und Build-Anleitung für Entwickler.
- Mit v0.4 sind keine Gruppennamen oder Group-IDs hartkodiert. Die Hauptstamm-Gruppe wählt der Admin per US-2; Teilstämme und Teams ergeben sich aus der Children-Hierarchie. Andere Gemeinden installieren denselben ZIP unverändert.

## Fragen, Klärungen, Pushback

Wenn beim Lesen Fragen aufkommen oder du eine PRD- oder ADR-Aussage für falsch hältst: bitte zurückspielen, bevor du einen Workaround in den Code eingebaut hast. Die ADRs sind unveränderlich nach Annahme — eine geänderte Entscheidung wird durch einen neuen ADR umgesetzt, der den alten supersedes (siehe `adr/README.md`).

Mit v0.4 sind alle ursprünglich offenen Punkte aus dem PRD geschlossen. Das nächste Review-Item kommt natürlich auf, sobald du in der Implementation auf eine API-Eigenheit triffst, die das PRD nicht abdeckt — z. B. das genaue Verhalten von 403 vs. 404 beim Gate-Check oder die Pagination der Members-Endpoints jenseits der getesteten Größen.

Viel Erfolg.
