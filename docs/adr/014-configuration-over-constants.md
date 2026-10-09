# ADR-014: Configuration over constants, and one gate for the whole extension

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** [bitte ergänzen]
- **Supersedes:** the access-model half of [ADR-008](008-declarative-access-rules.md)
  and the role-gate rationale in [ADR-011](011-personal-data.md). Both remain
  in force on everything else they say.

## Context

The extension was written for one Stamm and says so in five places: the group
type that makes a group a team (`groupTypeId === 1`), the role *names* that
make somebody a leader, the vacant positions worth showing, the member field
behind the Horizont tile, and the fee rates. Each was a reasonable shortcut
while there was one installation. Published as a public repository for other
Royal Rangers Stämme, each is a defect, and they fail differently:

- The team group type fails **loudly but mutely**: a Stamm whose teams sit
  under a custom group type gets an empty dashboard with no error, because
  "no teams found" and "no teams exist" render identically.
- The role names fail **silently**: an installation that calls its MAs
  something else counts fewer leaders, and the figure travels into the
  Jahresmeldung and from there into a report to the Bundesverband.

Two further things pushed the same way. A Stamm small enough to have no
Teilstamm layer could not be configured at all, because the Teilstamm picker
offered only children of the Hauptstamm and a group is not its own child. And
the fee model had "third child onwards is free" compiled in, so a Stamm with a
different ladder could not use the Beitragsabrechnung.

Separately, ADR-008 gave the Beitragsabrechnung a role rule — three of the
fourteen people in the Hauptstamm group — because its export carries names,
dates of birth and addresses for the whole Stamm. That was the right call
against the alternatives available then. It also assumed the extension had to
answer "who may see this", which turns out not to be true: ChurchTools keeps a
permission module per custom module, verified against the live instance:

```
rr-dashboard: { "view": true, "view custom data": [6], … }
```

The admin assigns that `view` right in ChurchTools' own rights management, the
way they do for every other module.

## Decision

**Nothing installation-specific lives in the source, not even as a default.
And the extension asks one access question, not four.**

### Configuration, with no defaults

All five values move into the KV-Store (`shared/settings.ts`), together with
the Hauptstamm and Teilstamm selection that was already there. `parseSettings`
fills absent fields with neutral emptiness — never with the authors' own
values. There is deliberately no migration that seeds the previous behaviour:
carrying `['mitarbeiter', 'teamhelfer', 'organisator']` or `80/60 €` in the
binary as a "default" would be the same defect wearing a different hat.

An unconfigured installation is a **state with its own screen**, not a gap to
paper over. Missing a required setting — Hauptstamm, at least one Teilstamm,
at least one team group type — means every tab shows the configuration hint
instead of a table. Missing an optional one is a statement: no extra leader
roles means only ChurchTools' own leadership counts; no Horizont field means
no tile.

Where a question would otherwise be abstract, the admin screen answers it from
the instance rather than from a constant: which group types actually occur
under the chosen Teilstämme and how many of each, how many people hold each
role, which member fields exist. A preview line reports what the current
selection would cover, so a misconfiguration shows a zero in the form before
it becomes an empty dashboard.

### One gate

`AccessRule` is down to its `membership` variant. All three tabs are visible
to anybody who passes it; `roleRule`, `checkRole` and `beitraegeRoleIds` are
deleted.

The membership check on the configured Hauptstamm group stays. It costs one
request, the group is the data root regardless, and it is a second layer if
the ChurchTools `view` right turns out to hide only the menu entry rather than
refuse the files — which we have not verified either way.

## Consequences

**What this enables:**

- The same ZIP runs at any Royal Rangers Stamm. That was the point.
- A Stamm with no Teilstamm layer names one group as both Hauptstamm and only
  Teilstamm. The organigram collapses the duplicate card.
- Adding a leadership role to a group type no longer needs a release, and
  neither does a change in the fee rates.
- The export explains the arithmetic it contains: the methodology sheet prints
  the configured ladder instead of a sentence about 80 and 60 euros.

**What this costs:**

- **The Beitragsabrechnung's export opens from three people to fourteen** on
  the live instance — everybody in the Hauptstamm group. That is a real
  widening of who can download names, dates of birth and addresses of about
  300 minors, and it is the price of not maintaining a second access model
  beside the one ChurchTools already has. Narrowing it again is a membership
  question now: take somebody out of the Hauptstamm group, or withhold the
  `rr-dashboard` right.
- Every installation, including the authors' own, must be configured once
  before it shows figures again. For them that is a few minutes with a screen
  that pre-fills everything from their own data; for a new Stamm it is the
  setup they would have to do anyway.
- `isLeaderRole` takes the configured role ids as an argument, so the four
  loaders thread the settings through. More plumbing, in exchange for the
  rule living in one place that is visibly fed from configuration.

**What we'd reconsider for:**

- Evidence that the ChurchTools `view` right does not restrict access to the
  bundle's files. The membership gate would then be the only barrier, and
  whether that is enough for the export is worth re-opening.
- A Stamm asking for per-tab visibility. The rule type can grow a variant
  again; it should come back with a use, not in anticipation of one.
- A second Stamm on the same installation. Everything here assumes one.

## Alternatives considered

**Keep the hardcoded values as migration defaults, applied on read.** Drafted
and rejected mid-design, on the user's objection: the extension would still
carry the authors' Stamm in its binary, and the next reader would have no way
to tell which constants are general and which are one church's convention.
The honest version is to have none and let an unconfigured installation say so.

**Derive everything at runtime** — teams are any child group with members,
leaders are whatever ChurchTools flags. Rejected: that is the kind of silent
inference that produced this ADR. A wrong guess would again look exactly like
a correct answer.

**Keep the role gate for the Beitragsabrechnung only.** Recommended during the
design and declined. It would have preserved ADR-008's reasoning at the cost
of one configuration field that every new Stamm has to understand before the
tab works. The decision records the trade rather than hiding it.

**A separate extension for the Beitragsabrechnung**, as ADR-011 already
weighed. Unchanged by this ADR: the argument there was about the data class,
and it concluded against. What changed is who may reach it, not what it holds.
