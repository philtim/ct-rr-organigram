# ADR-011: Personal data — aggregates on screen, detail only in the export

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** [bitte ergänzen]

## Context

Until the Beitragsabrechnung, this extension handled one class of data: who
holds which role, and how many people are in a team. Names appeared, but only
of leaders — adults in a published function.

The fee calculation needs a different class entirely: the name, date of birth
and home address of roughly 300 minors. That is what makes the feature useful
and what makes it a liability. The original recommendation was to build it as a
separate extension precisely because of this data class; the plan that was
approved instead draws a line *inside* one extension, and this ADR is what that
line consists of.

Two facts constrain how strong the line can be:

- **The gate is UX, not enforcement** (ADR-008). The bundle is reachable by
  anyone who can open `/ccm/<shorty>/`, and all data arrives with the
  *viewer's* own ChurchTools permissions. Confidentiality is carried by
  ChurchTools' person visibility and `CustomModulePermission`, not by this
  code.
- **Nothing we do prevents a determined viewer with API access from reading the
  same data directly.** The point is not to make the data unreachable. It is to
  make sure the extension does not *publish* it to people who merely opened a
  tab, and does not accumulate it anywhere.

## Decision

**Person-level data exists in the browser's memory for the length of a
download, and nowhere else. The web view renders aggregates only, and that is
enforced by type signature rather than by care.**

- **The view is handed `FeeAssignment`, which has no person fields.** It
  carries `personId`, `familyKey`, `tier`, `amountCents`, `payingPosition` —
  enough to count, not enough to name. A developer cannot accidentally render a
  participant's address in this view, because the object reaching the view does
  not have one.
- **Only the export path reads `RrParticipant`.** `buildExportRows` is the
  single place where a name, a birthday, an address and a fee travel together,
  and it is loaded by dynamic import at the moment the button is clicked
  (ADR-010).
- **The export snapshot is not reactive.** `useBeitraege` holds it in a plain
  closure variable, not a `ref`. A `ref` would be renderable by a stray
  `v-for` and inspectable in the Vue devtools of anyone who opens the tab.
- **Nothing is persisted.** No `localStorage`, no `sessionStorage` (already
  forbidden project-wide), and nothing in the ChurchTools KV-Store, which holds
  configuration only. Reopening the tab re-reads from ChurchTools; a stale
  figure would be worse than a second of loading.
- **The file names its own sensitivity.** The "Methodik & Quellen" sheet states
  that the file contains addresses of minors and should be deleted after the
  collection. The view says the same next to the download button. The retention
  question belongs to the Stammleitung, but the file should not arrive without
  stating it.
- **No participant data in the repository.** Test fixtures are synthetic
  (ADR-009); the *scenarios* are real, the people are invented. The parity
  check against the delivered 2026 list runs out of band and its working files
  are destroyed afterwards, because its input is exactly what must not be
  committed.
- **The relationship graph is over-fetched, knowingly.**
  `GET /persons/relationships` takes no person filter and answers with every
  relationship in the installation (5,940 rows). One request at 116 kB gzip
  replaced 305 per-person requests that took 15 s and tripped the rate limit.
  The response arrives under the viewer's own permissions, is reduced to parent
  and sibling edges touching a participant before anything else sees it, and
  nothing is rendered from it. The trade is recorded here rather than left as a
  surprise in the network tab.

## Consequences

**What this enables:**

- The Beitragsabrechnung can live beside the organigram without changing what
  the organigram is. A viewer of the fee tab sees numbers of the same character
  as "Benötigte Horizonte".
- The boundary survives contributors who have not read this document, because
  it is in the types.
- The blast radius of the gate being UX-only is a set of totals, not a list of
  children's addresses.

**What this costs:**

- The view genuinely cannot answer "which family is that?". A reader who wants
  to check a case has to download the file. That is the intended trade and it
  will occasionally be inconvenient.
- The export is a file on someone's laptop and then an email attachment. From
  that point this codebase has no say in what happens to it. Naming the
  expectation in the file is the most the software can do.
- Over-fetching the relationship graph means the browser briefly holds data
  about people far outside the Stamm.

**What we'd reconsider for:**

- A request to show per-family detail in the view. That is a different feature
  with a different access story, and it should supersede this ADR explicitly
  rather than be added quietly.
- ChurchTools gaining a person-filtered relationships endpoint, which would
  remove the over-fetch.

## Alternatives considered

**A separate extension for the Beitragsabrechnung.** The original
recommendation, on exactly this data-class argument. Rejected once the scope
became aggregates-only: a second ChurchTools custom module means two builds,
two ZIPs, two upload steps and a new app layer, which was estimated as the
larger half of the total effort — infrastructure, not domain logic. With no
person data on screen the data-class argument no longer carries it.

**Person detail in the view, behind the role gate.** Rejected: the gate is a
UX layer by its own ADR, so this would publish 300 children's addresses to
whoever can reach the bundle, and it would break the PRD's "no list of
individual members" non-goal.

**Encrypt or password-protect the export.** Rejected as theatre in this
context: the password would travel in the same email as the file. The real
control is who receives it.

**Keep the export server-side so the data never reaches the browser.** Rejected
— there is no server, and the data reaches the browser anyway, because that is
where it is computed.
