# ADR-009: Testing strategy — Vitest for pure logic

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** [bitte ergänzen]
- **Supersedes:** ADR-003 (no automated tests in v1)

## Context

ADR-003 declared itself time-limited and named the conditions for its own
replacement. One of them has now occurred, in its own words: "a piece of logic
complex enough that 'running it once and looking' stops being sufficient."

The Beitragsabrechnung (ADR-007) computes money. For the 2026 list that is
€18,320 across 303 participants in 181 families, and the computation is not a
sum over a column — it rests on two pieces of logic that are genuinely
intricate:

- **Sibling detection.** Two independent signals, unioned: ChurchTools
  relationships (shared parent or explicit Geschwister link) and same address
  plus same surname. Neither alone is sufficient on real data. The
  relationship field was missing for twelve sibling pairs; address alone merges
  unrelated families in a shared building. Over-merging a family wrongly
  exempts a child, under-merging wrongly charges one. Both are billing errors
  in a letter to a parent.
- **Fee tiering.** First child pays rate one, second rate two, every further
  child is exempt, and a participant who is themselves a Mitarbeiter pays
  nothing and is *removed from the count* so the next sibling becomes the first
  paying child. The off-by-one risk is obvious and the consequence is a wrong
  invoice.

Two further reasons the original objection no longer holds. ADR-003's core
argument was that the API shape was still unconfirmed and tests written against
it would need rewriting. That shape has since been confirmed by recon and is
exercised in production at 1.4.0. And there is now a reference result: the 2026
list was produced by a validated prototype, so there is a known-correct answer
for 303 real people to check an implementation against.

## Decision

We adopt **Vitest**, scoped to pure logic. ADR-003 named Vitest as the natural
choice and we see no reason to revisit that.

- **Scope:** pure functions — `src/shared/rr/**` first, `src/shared/access/**`
  and other `shared/` helpers as they grow. Functions with no Vue, no DOM and
  no network.
- **Out of scope, still:** component tests and end-to-end tests. ADR-003's
  reasoning holds unchanged — a read-only view whose entire input is a remote
  API gains little from those layers without a fixture investment larger than
  the feature.
- **`vitest.config.ts` is separate from `vite.config.ts`.** The build config is
  a function of `mode`, shells out to git for provenance and configures the dev
  API proxy. Tests need none of it, and sharing it would mean taking risk on
  the production build — whose `base` path is the one thing that must not break
  — for no benefit.
- **`npm run check` runs the tests**, between typecheck and build, so CI gates
  on them.
- **Fixtures are synthetic, never real participant data.** The rules under test
  are structural — who shares a parent, an address, a surname — so invented
  people exercise them exactly as real ones do. No participant's name, date of
  birth or address goes into the repository (see ADR-011). The *scenarios* are
  real: each test case mirrors a situation found on the live instance.
- **Parity with the reference result is verified out of band.** A throwaway
  script runs the compiled modules against live data and compares against the
  delivered spreadsheet. That check cannot live in the repo, because its input
  is exactly the personal data we refuse to commit. It is rerun by hand when
  the fee logic changes.

## Consequences

**What this enables:**

- The money logic has an executable specification. Every rule the Stammleitung
  stated is a named test, so the next reader learns the rules from the tests
  rather than from a conversation they were not part of.
- Refactoring confidence where it matters most. The first run already paid for
  itself: a test caught `normalizeStreet` leaving the abbreviation dot on
  "Paulinenstr." while folding "Paulinenstraße" to "paulinenstr", so the two
  spellings of one street did not match and a sibling pair would have been
  split — charging a family €60 too much.
- A seam for the access rules too, where fail-closed behaviour is worth
  asserting rather than assuming.

**What this costs:**

- One devDependency and a config file.
- `npm run check` takes about a second longer.
- Synthetic fixtures do not catch data-shape surprises from ChurchTools. The
  out-of-band parity check covers that, but it is manual and therefore easy to
  skip.
- A gap remains between the tested units and the rendered view. Nothing asserts
  that the view actually passes the configured rates into `assignFees`.

**What we'd reconsider for:**

- A bug in the view layer that unit tests structurally cannot catch — the first
  real argument for component tests.
- The parity check being skipped often enough to matter, which would argue for
  a committed anonymized fixture generated from live data.

## Alternatives considered

**Stay with ADR-003 and keep testing by hand.** Rejected: the logic decides
invoices for 181 families, and "running it once and looking" cannot cover
sibling clustering, whose failure modes are invisible in aggregate. The
`normalizeStreet` bug produced correct-looking totals.

**Commit an anonymized snapshot of the 303 participants as a fixture.**
Attractive — it would make the parity check automatic. Rejected for now because
a faithful anonymization has to preserve exactly the structure that identifies
people: family groupings, addresses, ages. Getting that wrong publishes what it
meant to protect, and the hand-written cases already cover every rule branch.
Worth revisiting if the manual check starts being skipped.

**Property-based testing for the fee tiers.** Tempting, since the invariants
are crisp: the family total never exceeds rate one plus rate two, exactly one
child per family holds position one, staff always pay zero. Rejected as a next
step rather than a first one — the stated rules are few enough to enumerate,
and enumerated cases document them better for the next reader.

**Component tests with Vue Test Utils.** Rejected, carrying ADR-003's reasoning
forward unchanged.

**End-to-end tests against ChurchTools.** Rejected for the reason ADR-003 gave:
it needs either a service account (excluded by `docs/PRD.md:81`) or a fixture
server mirroring the API, both larger projects than this extension.
