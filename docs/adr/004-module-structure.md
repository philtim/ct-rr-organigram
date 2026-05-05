# ADR-004: Module structure — feature folders + shared

- **Status:** Accepted
- **Date:** 2026-05-05
- **Decided by:** [bitte ergänzen]

## Context

The extension has three distinct features that don't overlap much:

1. **Gate** — verifies the user is a member of "RR Gesamtmitarbeiter" (US-1).
2. **Dashboard** — renders the three-level organigram (US-3, US-4, US-5, US-6, US-7, US-9).
3. **Admin** — lets an administrator pick the leader role IDs (US-2).

Each feature has its own UI, its own state, and its own API needs. A few concerns are shared across all three: the ChurchTools API client (ADR-005), the KV-store helper, common type definitions, and a handful of utility functions.

The community example `karteileichen` shows what happens with a flat structure: a single `main.ts` that grew to 890 lines before being refactored into `state.ts`, `api.ts`, `ui.ts`, `events.ts`. That refactor untangled responsibilities by *layer*, but in our project the more useful split is by *feature* — gate logic, dashboard logic, and admin logic don't share state and shouldn't share a state file.

## Decision

We organize `src/` by **feature folders**, each owning its own UI, state, and feature-specific API logic, with a `shared/` folder for cross-cutting concerns.

```
src/
├── main.ts                      # boot, mount, route to feature
├── App.vue                      # top-level shell, applies .rr-dashboard-root
├── gate/
│   ├── Gate.vue                 # the access-denied / config-missing screens
│   ├── useGate.ts               # composable: is current user in the gate group?
│   └── gate.api.ts              # gate-specific API calls
├── dashboard/
│   ├── Dashboard.vue            # top-level dashboard component
│   ├── HauptstammCard.vue
│   ├── TeilstammCard.vue
│   ├── TeamChip.vue
│   ├── SkeletonLayout.vue
│   ├── useDashboard.ts          # composable: load + cache organigram data
│   ├── hierarchy.ts             # pure logic: parent/child resolution
│   ├── counts.ts                # pure logic: leader/member counting
│   └── dashboard.api.ts         # dashboard-specific API calls
├── admin/
│   ├── Admin.vue
│   ├── RoleSelector.vue
│   ├── useAdminSettings.ts      # composable: read/write KV-store settings
│   └── admin.api.ts
└── shared/
    ├── api.ts                   # ChurchTools API client wrapper (see ADR-005)
    ├── kv-store.ts              # KV-store helpers from the boilerplate
    ├── types.ts                 # shared TypeScript types
    ├── toast.ts                 # toast notification component + composable
    └── constants.ts             # gate group name, refresh timeout, etc.
```

**Rules of the structure:**

- Feature folders never import from each other. Cross-feature needs go through `shared/`.
- Pure logic (no Vue, no DOM, no API) lives next to the feature that uses it (`hierarchy.ts`, `counts.ts`) so it's easy to find. If logic ends up reused across features, it moves to `shared/`.
- Each feature exposes one or more **composables** (`useGate`, `useDashboard`, `useAdminSettings`) that the feature's components consume. Components don't call APIs directly — they use the composable.
- The boundary between feature and `shared/` is decided by reuse: something is shared the moment a second feature needs it, not before.

## Consequences

**What this enables:**

- A new contributor opening `src/dashboard/` sees everything related to the dashboard in one place. The mental model maps to the PRD's user-story groupings.
- Feature-scoped refactoring stays local. Renaming a dashboard component doesn't ripple through admin code.
- Composables are the natural seam for future testing — when ADR-003 gets superseded and we add tests, `useDashboard.ts` and `hierarchy.ts` are obvious starting points.
- The structure makes the eventual public-fork story cleaner: someone forking for their own organization can see at a glance what each feature does.

**What this costs:**

- More folders than a flat structure. For a small project this can feel like over-organization on day one.
- Some duplication in `*.api.ts` files where two features happen to call similar endpoints. Acceptable: we only consolidate when it's the same call, not when it's a similar call.
- Slightly more verbose imports (e.g. `import { useDashboard } from '@/dashboard/useDashboard'`).

**What we'd reconsider for:**

- Significant feature growth where one feature folder gets large enough to need its own internal subdivision.
- A monorepo move where features become separate packages.

## Alternatives considered

**Layered (`state.ts` / `api.ts` / `ui.ts` / `events.ts`).** The karteileichen pattern. Rejected because our three features have meaningfully separate concerns: lumping gate-state and dashboard-state into one `state.ts` mingles things that don't share lifecycle. Layered is the right choice when there's *one* thing being built.

**Single `main.ts` until pain is felt.** Rejected because we know in advance the project has three features. We'd refactor within a few weeks anyway, and the layout is cheap to set up at the start.

**Framework-idiomatic only (Vue components and composables wherever they want to live).** Rejected because Vue is unopinionated about file organization at scale; teams converge on conventions, and "feature folders" is the most common one. Defining the convention up front avoids drift.

**Atomic Design (atoms/molecules/organisms).** Rejected because the dashboard's component count is small enough that the atomic taxonomy adds more confusion than clarity. There are maybe twelve components total; they don't need a five-level hierarchy.
