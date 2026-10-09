# ADR-010: Client-side .xlsx export with `write-excel-file`

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** [bitte ergänzen]

## Context

The Beitragsabrechnung view shows aggregates only — that is the scope boundary
ADR-011 exists to hold. The person-level list the Gemeindebüro needs for the
collection on 1 December therefore has to leave the extension as a file.

Three constraints shape the choice:

- **The file must be a spreadsheet, not a text dump.** The 2026 list was
  delivered as .xlsx and the office works in it. CSV fails on German Excel in
  four separate ways — semicolon separator, decimal comma, BOM for umlauts, and
  date auto-conversion mangling `07.03.2014` — each of which turns into a
  support question.
- **It must be produced in the browser.** `docs/PRD.md:78` keeps this extension
  read-only against ChurchTools and there is no backend to generate files on.
- **It must not slow the organigram down.** Everyone who can open the extension
  loads the same bundle. The organigram's audience is 14 people, of whom 3 need
  the export; they must not all pay for a spreadsheet writer.

A fourth consideration emerged from how the 2026 list was actually used: the
office corrected two family assignments by hand. A file of frozen numbers makes
that correction a request back to us.

## Decision

**`write-excel-file`, pinned to an exact version, loaded through a dynamic
`import()`, writing a formula model rather than a value dump.**

- **Exact version, not a range.** `"write-excel-file": "4.1.1"` — this is the
  first third-party runtime dependency besides `vue` and
  `@churchtools/churchtools-client`, and it renders a document about money. A
  caret range would let a patch release change cell output without a commit in
  this repository.
- **Dynamic import, enforced in CI.** `src/beitraege/xlsx.ts` is the only
  module that imports the library, and it is reached by `import()` from
  `useBeitraege`. `scripts/check-bundle.js` holds the entry chunk to a gzip
  budget and asserts the lazy chunks still exist, because turning the dynamic
  import static is a one-character change that nothing else would notice.
  Measured: entry chunk 74.9 kB gzip, deferred 23.9 kB gzip across three
  chunks.
- **The workbook is a model.** "RR-Kinder in Familie", "Kind-Nr.",
  "Beitragspflicht", "Beitrag in €" and "Hinweis" are Excel formulas over the
  Familien-ID column and the two rate cells, which are marked yellow as the
  only cells meant to be edited. Correcting a family or changing a rate
  recomputes the list in the office's hands.
- **The formulas are a second opinion.** They recompute from scratch what
  `assignFees` already decided, and the summary sheet subtracts the two
  ("Abweichung zur Web-Ansicht"). A disagreement between this codebase and the
  spreadsheet is visible in the file, to the person reading it.
- **Row order is part of the contract.** The "Kind-Nr." formula counts a
  family's non-Mitarbeiter rows *above* each row, so the row order decides
  which sibling is the exempt third child. `buildExportRows` keeps exactly the
  order `assignFees` used, and a unit test replays the sheet's arithmetic over
  the exported order to insist the two agree.
- **Verification includes a real recalculation.** The generated file is opened
  by LibreOffice headless and read back: zero formula errors, and the
  independently recalculated total equals the extension's. Run against live
  data: 305 rows, €18,460 from both.

## Consequences

**What this enables:**

- The office gets the list it already knows how to work with, and can fix a
  family assignment or a rate without a release.
- The export cannot drift from the view. It is built from the same snapshot the
  figures were computed from — deliberately not a second fetch, which could
  produce a file disagreeing with the page that produced it.
- The spreadsheet checks our arithmetic. Two independent computations of
  €18,460 is a stronger statement than one.
- The organigram's load is unchanged. Nobody who only reads figures downloads a
  spreadsheet writer.

**What this costs:**

- A third-party dependency in a money path, pinned and therefore updated by
  hand. `fflate` comes with it as a transitive dependency.
- The formula model hard-codes "from the third child" in the sheet's `>=3`
  comparison. Only the two rates are data; a rule change means a code change.
- `write-excel-file` cannot write an autofilter, which the hand-built 2026 file
  had. The header row is frozen instead.
- Formula cells carry no cached value, so a viewer that does not recalculate
  shows them empty. Excel and LibreOffice both recalculate on open; a
  file-preview pane may not.

**What we'd reconsider for:**

- A second export (per Teilstamm, or a different period) would make the
  hard-coded sheet layout worth generalising.
- The office asking for a PDF, which this library cannot produce.

## Alternatives considered

**SheetJS (`xlsx`).** Rejected: the npm package is the stale community build
and carries known advisories; the maintained release is distributed outside
npm. At 150–250 kB gzip it is also an order of magnitude larger than needed for
three sheets.

**ExcelJS.** Rejected: over 1 MB and expects Node polyfills in the browser. It
would cover features we do not use.

**CSV.** Rejected on German Excel's behaviour alone, and it cannot carry three
sheets, formulas, or the methodology the file needs in order to be auditable a
year later.

**Static values instead of formulas.** Simpler, and tempting. Rejected because
it moves every correction back to us: the 2026 list needed two family fixes in
its first week, and a frozen file turns each into a code change.

**A fetch at export time rather than a snapshot.** Rejected: the view's figures
and the file would be two different reads of a changing instance, and the
acceptance criterion is that they agree.

**Server-side generation.** Rejected: there is no server, and adding one to
write a spreadsheet would be the largest change in this project to date.
