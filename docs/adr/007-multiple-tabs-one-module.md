# ADR-007: Multiple tabs in one extension, not a second custom module

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** [bitte ergänzen]

## Context

The Gemeindebüro asks the Hauptstammleiter once a year, in October, for a list of active
RR participants so the membership fees can be collected on 1 December. The list has to
show which children are exempt: from the third child of a family onward, and anyone who
is also a Mitarbeiter. A one-off script produced that list for 2026 — 303 participants in
181 families, 247 of them liable, €18,320 at the 80/60/free tier.

Turning that into a permanent feature raised the question of where it belongs. Two things
about it are genuinely new for this extension: it needs person-level detail (names, dates
of birth, addresses), and its audience is narrower than the dashboard's — the
Hauptstammleitung, three of the fourteen people who pass today's gate.

What makes the question answerable is the chosen shape of the feature: **the web view
shows only aggregates, and person-level detail exists only inside the downloaded
spreadsheet.** With no payment tracking, the extension also stays entirely read-only.
That keeps the PRD's non-goals intact — `docs/PRD.md:75` ("KEINE Liste einzelner
Mitglieder") is about the UI, and `:78` ("Schreiboperationen … NICHT in dieser Extension")
is about writes. The spreadsheet export is only excluded *for v1* (`:76`), and `:702`
already lists it as a v1.1 candidate; we are at 1.4.0.

The ChurchTools side constrains the options sharply. A custom module is **one** `shorty`,
served at **one** path `/ccm/<shorty>/`, with **one** menu entry. The ZIP carries no
manifest — `scripts/package.js:51` is a plain `zip -r <archive> dist/` — so there is
nowhere to declare views or routes. The module's identity lives server-side, created via
`POST /api/custommodules` with `{name, shorty, sortKey, inMenu, description}`;
`CustomModuleCreate` (`src/shared/ct-types.d.ts:1579-1584`) has no field that could
describe more than one view, and `inMenu` is a boolean. `vite.config.ts:41` derives
`base: /ccm/${env.VITE_KEY}/` and therefore produces exactly one asset base per build.

A second module would mean two Vite builds with separate `base` values, two ZIPs, a
rewritten `scripts/package.js`, a release-please migration from single-package to
monorepo, two upload steps in each of two workflows, and a new app layer above the
feature folders of ADR-004. That is more work than the feature itself.

Meanwhile, serving several views from one module is already proven here: `src/App.vue:10-16`
switches between `<Admin>`, `<Dashboard>` and `<Gate>` on a `?admin=1` query parameter.

## Decision

The Beitragsabrechnung becomes a **second tab inside the existing extension**. We keep one
custom module, one `shorty`, one menu entry, and select the active tab from a query
parameter, extending the pattern `src/App.vue:10-16` already uses.

- A new feature folder `src/beitraege/` sits alongside `gate/`, `dashboard/` and `admin/`,
  per ADR-004.
- Domain logic that both the tab and the export need lives in `src/shared/rr/`, because
  the view's figures *are* the aggregation of the export's rows. Two independent
  implementations would drift, and these numbers decide how much money is collected.
- The tab bar renders only the tabs the current user may open; each tab carries its own
  access rule (ADR-008).
- No Vue Router. Two or three flat views with no history, no nested routes and no route
  params do not justify the dependency — the same reasoning `src/App.vue:12` already
  records for the admin route.

## Consequences

**What this enables:**

- The whole second-module infrastructure is avoided. Build, packaging, versioning and
  deployment stay exactly as they are today.
- The Hauptstammleitung reaches both views from one menu entry, with one login and one
  mental model.
- `src/shared/rr/` becomes the single source for participant, Mitarbeiter, family and fee
  logic. The tab counts `FeeAssignment` records; the export reads the person rows. Because
  the view's code path never sees a name, "no person data in the web UI" is enforced by
  type signature rather than by discipline.
- The extension keeps its read-only character, so no new non-goal has to be renegotiated.

**What this costs:**

- The bundle grows for every user, including those who only ever open the organigram. The
  export library is therefore dynamically imported (ADR-009), and the tab loads its data
  lazily on first activation so the organigram's load time is untouched.
- Both views share one KV module and one settings object. `Settings` has to grow room for
  the Beitrag configuration without the organigram caring about it.
- Access control stops being a single yes/no for the whole extension and becomes per-tab
  (ADR-008). That is new structure in a place that was previously one `if`.
- Should the two views ever diverge in audience or lifecycle, splitting them later means
  doing the two-module work after all — on a larger codebase.

**What we'd reconsider for:**

- An audience outside the RR leadership needing the Abrechnung — the Gemeindebüro getting
  its own access, say. Today it receives the spreadsheet by email and has no account here.
- Payment tracking being added after all. That would make the extension read-write and
  reopen `docs/PRD.md:78`.
- A third or fourth view, at which point a real router and possibly separate modules start
  to earn their cost.

## Alternatives considered

**A separate "RR Beitragsliste" extension (second custom module).** The initial
recommendation, and the right answer for a different feature shape: one that put 303
children's addresses on screen and wrote payment records. Rejected because aggregates-only
plus read-only removes both reasons, leaving only the infrastructure cost — two builds,
two ZIPs, a release-please monorepo migration (where commits touching only `src/shared/**`
map to no package and would silently produce no release), and an `src/apps/` layer above
ADR-004's feature folders. Infrastructure, not product.

**Everything in the dashboard view, no tab.** Rejected because the Abrechnung has a
narrower audience. Putting a fee summary and an export button on the organigram page shows
them to all fourteen gate members, including five Teilstamm leaders and two plain
Mitarbeiter who have no business with the whole Stamm's data.

**Aggregate figures in the dashboard, export left as a script.** Genuinely tempting: a
once-a-year export does not obviously earn a UI. Rejected because the export is the part
the Gemeindebüro actually needs, and a script that only runs on one developer's machine is
not a feature the Hauptstammleitung can use. With the logic in `src/shared/rr/` anyway,
the export button is small.

**Vue Router for the tabs.** Rejected per ADR-001's reasoning: the router's value is
nested routes, guards and history, none of which two flat views need. The query parameter
keeps deep links working, which is all that is required.

**Hash-based routing (`#beitraege`).** Rejected because ChurchTools itself uses hash URLs
for its own navigation (`?q=churchdb#PersonView/...`, visible in person `frontendUrl`
values). Competing for the fragment risks conflicts with the host; the query string is ours.
