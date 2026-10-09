# ADR-013: The Jahresmeldung names people with data gaps, never their values

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** [bitte ergänzen]

## Context

ADR-011 drew a line for the Beitragsabrechnung: the view renders aggregates,
person-level data exists only in the export path, and the boundary is enforced
by type signature. That ADR's scope is one tab. The Jahresmeldung is a third
tab with a different shape, and it crosses that line in three places. Deciding
quietly would leave the next reader with an ADR that describes a rule the code
no longer follows.

The three crossings:

- **It needs dates of birth in the view.** The Bund's form separates
  *Juniorleiter* from *Mitarbeiter*, and the Stamm's own definition of a
  Juniorleiter is a leader under 18. ChurchTools has no Juniorleiter role to
  read — confirmed against the live instance, which defines 33 roles and none
  of them is one. The distinction can only be computed from `birthday`, so the
  figure on screen is derived from a date of birth, unlike every number the
  organigram shows.
- **It needs gender.** Six of the form's columns are a gender split. This is
  `personFields[].sexId`, and it is read for every person in scope.
- **It must name people.** Recon found 73 of 366 people (19.9 %) with no usable
  gender. A view that reports "73 unassignable" and stops is worse than the
  manual count it replaces: the figure cannot be acted on. To be useful the
  view has to say *who*, and link to them.

Against that, two facts from ADR-011 still hold and are not reopened here: the
access gate is UX rather than enforcement (ADR-008), and every byte arrives
with the viewer's own ChurchTools permissions.

A fourth fact is specific to this tab and pulls the other way: unlike the
Beitragsabrechnung, the Jahresmeldung has **no role gate at all**. Anyone who
can open the dashboard can open it. That was a deliberate product decision —
the tab reports aggregates about a Stamm to the people who run that Stamm — but
it means whatever this view renders is rendered to the widest audience the
extension has.

## Decision

**The Jahresmeldung may name a person when, and only when, something about
their record blocks the count. It never renders the value that is missing,
wrong or unrepresentable.**

Concretely:

- **The table is pure aggregation.** Every cell is a count. No name, no date, no
  `sexId` reaches `JahresmeldungTable.vue`.
- **The Datenqualität panel renders `name` and `frontendUrl`, and nothing
  else.** Its row type carries exactly those two fields plus a machine-readable
  reason code and the row the person was counted in. A developer cannot
  accidentally render a birthday here, because the object reaching the panel
  does not have one. This is ADR-011's enforcement mechanism applied to a
  different shape, not a new one.
- **The link is ChurchTools' own.** `person.frontendUrl` arrives inline in the
  member response and is passed through verbatim. The extension constructs no
  person URL and hardcodes no URL format. Following the link lands the viewer in
  ChurchTools, where their own permissions apply — so the fix happens in the
  system that owns the data, under that system's rules.
- **Dates of birth are reduced on arrival.** `birthday` is turned into a boolean
  (`isMinor`) inside the loader and discarded. No component receives a date, and
  no reactive reference ever holds one. Same for `sexId`, which becomes one of
  `'m' | 'w' | 'unassignable'`.
- **Nothing is persisted.** No `localStorage`, no `sessionStorage` (forbidden
  project-wide), nothing in the KV-Store, which holds configuration only. The
  tab re-reads from ChurchTools on every open.
- **`divers` is not a data gap.** `sexId = 3` is a complete, correct record that
  a two-gender form cannot express. It lands in the same column as a missing
  value because the form leaves no alternative, but the panel reports it under
  its own heading, with no call to correct anything. Filing a person's recorded
  gender under "nicht gepflegt" would be a factual error in the UI, and the
  cost of avoiding it is one extra reason code.

## Consequences

**What this enables:**

- The view is actionable. A Stammleiter sees the gap, clicks through, fixes it
  in ChurchTools, reloads, and the number moves. Without the names, the 19.9 %
  would be a permanent, inexplicable discrepancy between the form columns and
  "Gesamt Stamm".
- The gap becomes visible at all. It was in the data the whole time; counting by
  hand never surfaced it, because a human counting heads does not notice a blank
  field.
- The widest-audience property stays acceptable, because what the widest
  audience sees is a name that is already on the organigram's cards next to a
  link they could have reached through ChurchTools' own search.

**What this costs:**

- The panel is a list of names of people in the Stamm, including minors, shown
  to everyone with dashboard access. That is a real widening versus ADR-011's
  aggregates-only view, and it is the deliberate price of making the figure
  fixable. It is bounded by what it does *not* include: no birthday, no address,
  no gender value, no team roster — a name and a link, which is less than the
  organigram's Teilstamm cards already show for leaders and less than
  `DuplicatesPanel` already shows for participants.
- Dates of birth for everyone in scope travel through the browser on every load
  of this tab. They are reduced before anything renders, but they do arrive.
- The reduction is a discipline the types enforce only one level deep: the
  loader is the single place that sees a raw `birthday`, so it is the single
  place a reviewer has to look.

**What we'd reconsider for:**

- A request to show the missing value itself ("born 2009-03-14, no gender"), to
  let someone judge without leaving the tab. That is a different feature with a
  different audience, and it should supersede this ADR explicitly.
- A role gate arriving on this tab later. It would narrow the audience and make
  the trade easier, but it is not a reason to widen what is rendered.
- ChurchTools gaining a Juniorleiter role, which would remove the need for
  `birthday` in this view entirely.

## Alternatives considered

**Aggregates only, no names — strict ADR-011.** Rejected: it produces a number
nobody can act on. 73 unassignable people would stall the annual report with no
path forward, and the user would go back to counting by hand, which is the
problem the tab exists to solve.

**Names behind a role gate, like the Beitragsabrechnung.** Rejected on product
grounds, not privacy grounds: the user asked explicitly for no separate
configuration on this tab, and the panel's content does not warrant one. A gate
here would also be the same UX-only gate ADR-008 describes, so it would buy
appearance rather than protection.

**Export the gap list as a file instead of rendering it**, mirroring ADR-010's
pattern. Rejected: a download is the right shape for 305 rows of addresses
destined for an office; it is the wrong shape for a to-do list of 73 links that
the reader wants to click one at a time and watch shrink.

**Compute the Juniorleiter split from team membership** — "a leader who is also
a Pfadranger" — avoiding dates of birth altogether. Rejected: it requires
knowing which Teilstamm is the Pfadranger one, which means either a hardcoded
group name or a new configuration. PRD v0.4 removed hardcoded Teilstamm names
on purpose, and the user ruled out added configuration for this tab. It also
misclassifies an 18-year-old who still sits in a Pfadranger team. The age rule
needs no group names and reuses a field the Beitragsabrechnung already
requests.
