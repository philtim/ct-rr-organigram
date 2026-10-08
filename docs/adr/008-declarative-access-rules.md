# ADR-008: Access control — declarative access rules per view

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** [bitte ergänzen]

## Context

Until now the extension had exactly one question to answer about access: is the current
user a member of the configured Hauptstamm group? `src/gate/useGate.ts` holds a single
status ref, `src/App.vue:13-30` runs the check once, and the template picks between Admin,
Dashboard and Gate from that one result.

ADR-007 adds a second view with a narrower audience. The organigram belongs to the whole
Stammleitung — fourteen people in "RR Gesamt-Stammleitung" today: two Hauptstammleiter,
one Hauptstammwart, five Stammleiter, three Stammwart, one Stammhelfer and two plain
Mitarbeiter. The Beitragsabrechnung belongs to the Hauptstammleitung, three of those
fourteen, because its export contains names, dates of birth and addresses for the entire
Stamm. The five Teilstamm leaders and the two Mitarbeiter have no need for that.

One access question has become two, and the second one is about a **role**, not just
membership. That distinction is new: `GET /groups/{groupId}/members/{personId}` is used
today purely for its HTTP status, and `src/gate/gate.api.ts:26` writes
`await ct.get(...)` and throws the body away. The body is a `GroupMember`
(`src/shared/ct-types.d.ts:3274-3300`), which carries both `groupTypeRoleId` (`:3284`)
and `groupMemberStatus` (`:3283`, the `MemberStatus` enum at `:3998` —
`active | requested | to_delete | waiting`). The list endpoint goes further and filters
server-side: `GET /groups/{id}/members` accepts `role_ids[]` (`:22459`), `person_id[]`
(`:22463`) and `group_member_statuses[]` (`:22467`).

So a role check costs one request and no new concept. What is missing is a place to say
*which* rule a given view requires.

Two existing weaknesses are worth fixing in the same change:

- **`src/App.vue:23-26` skips the gate entirely for `?admin=1`** — it sets `ready = true`
  without calling `loadSettings()` or `runGate()`. Anyone who knows the URL reaches the
  group picker and can save the configuration. The damage is limited today; with a second
  view behind a stricter rule, a bypass that ignores rules altogether is the wrong
  foundation.
- **The current check ignores `groupMemberStatus`**, so a `waiting` or `requested` member
  passes the gate. That is almost certainly unintended, but changing it changes behaviour
  for real users.

## Decision

Access becomes a **declarative rule attached to each view**, evaluated by one shared
mechanism. `src/gate/` moves to `src/shared/access/`, because a second feature now needs
it — exactly the trigger ADR-004 names for promoting code into `shared/`.

```ts
export type AccessRule =
    | { kind: 'membership'; groupId: number; requireActive?: boolean }
    | { kind: 'role'; groupId: number; roleIds: number[] };
```

- **`membership`** resolves as today: `GET /groups/{groupId}/members/{personId}`,
  200 means member, 404 means not a member. The organigram uses this rule, with
  `requireActive` left off so its behaviour is bit-for-bit what it is now.
- **`role`** resolves in one request:
  `GET /groups/{groupId}/members?person_id[]=…&role_ids[]=…&group_member_statuses[]=active`.
  A non-empty result means allowed. No second call, no client-side filtering.
- **Role IDs come from configuration, not from source.** The admin picker reads
  `GET /groups/{id}?include[]=roles` — already implemented in
  `src/dashboard/dashboard.api.ts:20-22` — and offers the group's `GroupRole` entries
  (`ct-types.d.ts:3448-3456`) by name while storing their `groupTypeRoleId`.
- **Fail closed.** Only a 404, or an empty result for a role rule, denies access.
  Everything else — 403, 5xx, timeout, network failure — produces `error`, so the user
  sees "couldn't verify" rather than a silent denial. This preserves the behaviour
  `src/gate/gate.api.ts:18-20` already documents.
- **Rules gate the view, not the tab bar.** Hiding a tab is presentation; the rule is
  re-checked when the view mounts, so a hand-typed URL is denied too.
- The `?admin=1` bypass goes away. Admin becomes a view with its own rule like any other.

### What this decision explicitly does not claim

The gate is **user experience, not enforcement**, and the ADR says so out loud because
the second view raises the stakes. The bundle is downloadable by anyone who can reach
`/ccm/<shorty>/`, and every API call runs with the *viewer's* ChurchTools session, not
the extension's. A user who defeats the client-side rule still only sees what ChurchTools
would have shown them anyway.

Real confidentiality therefore rests on two server-side mechanisms, and relying on them
is part of this decision:

- **Person visibility.** `Person.securityLevelForPerson` governs which fields a viewer
  receives; someone without rights to addresses gets empty fields, not hidden ones.
- **`CustomModulePermission`** (`ct-types.d.ts:1608-1619`) with `view`,
  `view custom data`, `edit custom data` and `create custom data`. This is the actual
  access control for the module and must be configured on the instance.

`docs/PRD.md:154-155` already records the gate as a UX measure. This ADR keeps that
framing and names what carries the rest.

## Consequences

**What this enables:**

- Two views with genuinely different audiences, without duplicating the gate.
- Role-based access at all, which the 200/404 check could not express.
- A single place to reason about who sees what — useful the next time an audience question
  comes up, and a good seam for the first unit tests under ADR-009.
- The `?admin=1` bypass is closed as a side effect rather than as a separate fix.
- Role configuration by ID instead of by name avoids the fragility of
  `src/shared/constants.ts:22-39`, where German role names are matched as strings.

**What this costs:**

- More access requests. The organigram keeps its single call; opening the Abrechnung adds
  one. Negligible, but no longer exactly one check per session.
- `Settings` grows: the Abrechnung rule needs its own group and role IDs, and the admin
  form needs a role picker beside the existing group and Teilstamm pickers.
- The move of `src/gate/` touches every import of it. It is a pure refactor, verified by
  `npm run check` and a deploy to rr-demo before anything is built on top.
- Evaluating a rule per view means a user can be allowed in one view and denied in
  another, so every view needs a denied state. Today there is one.

**What we'd reconsider for:**

- A rule that cannot be expressed as membership or role — several groups combined, say, if
  the Gemeindebüro ever gets its own access. An `{ kind: 'any'; rules: AccessRule[] }`
  variant was designed for exactly that and deliberately left out until needed.
- ChurchTools exposing a usable permissions endpoint, which would be a better source of
  truth than group roles.
- Deciding that the organigram's gate should require `groupMemberStatus === 'active'`
  after all. That is a product question about `waiting` members, not a technical one, and
  is left open on purpose.

## Alternatives considered

**Keep one gate for the whole extension and hide the Abrechnung tab in the UI.** Rejected
because hiding is not denying: the view would still mount on a typed URL and still fetch
person data. With addresses of minors in play, presentation-level protection is not
enough.

**Match role names as strings, like `LEADER_ROLE_NAMES` in
`src/shared/constants.ts:22-39`.** Rejected because it breaks the moment someone renames
a role in ChurchTools or another installation spells it differently, and because the data
needed to do it properly is already available — `groupTypeRoleId` is stable per group type.
The existing name matching stays where it is; this ADR does not extend the pattern.

**A dedicated ChurchTools group for the Abrechnung audience, checked by membership.**
Simpler to implement — no role rule needed. Rejected because it is a second list of people
to maintain by hand, which will drift from the actual Hauptstammleitung. The roles already
encode who holds the position.

**Fetch all group members once and filter client-side.** Rejected because
`role_ids[]` + `person_id[]` + `group_member_statuses[]` lets the server answer the exact
question in one request, and because pulling a member list in order to decide whether the
user may see anything inverts the check.

**Fail open on API errors, treating an unreachable check as permission.** Rejected
outright for a view that exports personal data.
