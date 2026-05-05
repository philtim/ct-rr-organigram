# ADR-003: Testing strategy — no automated tests in v1

- **Status:** Accepted
- **Date:** 2026-05-05
- **Decided by:** [bitte ergänzen]

## Context

The RR Dashboard is a read-only extension that mostly arranges and displays data fetched from ChurchTools. The view changes on initial load, manual refresh, and partial error states. There is one stateful concern (admin configuration of leader role IDs in the KV-store) and a handful of pure-logic units that would benefit from regression tests in principle: the hierarchy adapter, leader/member counting, the `fetchAllPages` pagination wrapper.

The team and project context: a small extension built quickly against a closed-beta API whose exact endpoint shapes still need to be confirmed via live recon (see the PRD's Pre-Implementation Recon section). Investing in a test suite *before* the API shape is locked risks writing tests that need to be rewritten when reality intrudes.

## Decision

We ship v1 with **no automated tests**. We rely on three other quality mechanisms during v1:

1. **TypeScript** for type safety.
2. **ESLint** with `eslint-plugin-vue` for static analysis and Vue-specific rules.
3. **Manual exploratory testing** against `https://rr-demo.church.tools` during development.

Tests get added when we feel concrete pain — a regression that ships, a refactor that breaks something subtle, or a piece of logic complex enough that "running it once and looking" stops being sufficient.

## Consequences

**What this enables:**

- Faster iteration during the recon-and-implementation phase, where the underlying API shape is still being confirmed.
- A smaller cognitive load and dependency footprint for v1.
- The ability to make architectural changes (e.g. when Recon-2 reveals the hierarchy endpoint shape) without invalidating a test suite.

**What this costs:**

- No safety net for refactoring beyond what TypeScript + ESLint catch. We accept that a refactor might break something subtle, and we'll catch it manually or in production.
- New contributors have no executable specification of how individual modules are supposed to behave.
- Public-fork users have no test suite to run after their own changes — they're trusting the same TypeScript-and-eyeballs approach we are.

**What we'd reconsider for:**

This ADR is explicitly time-limited. We add tests when one of the following happens:

- A bug ships that an obvious unit test would have caught — the bug, plus a regression test, justify retroactively introducing the test framework.
- We refactor `loadHierarchy()` or the count logic and feel uncertain whether the result still produces the correct output.
- A second contributor joins and asks for a test suite as an onboarding aid.

When we add tests, the natural choice is **Vitest** (it ships with Vite, the boilerplate already uses Vite, and zero additional config is required). We start with unit tests on pure logic — `hierarchy.ts`, the count function, `fetchAllPages` — and expand only if pain continues.

We deliberately do **not** plan for component tests (Vue Test Utils) or end-to-end tests (Playwright) in v1 or v1.1. A read-only dashboard whose entire input is a remote API doesn't get much from those layers without significant fixture investment.

## Alternatives considered

**Unit tests for pure logic only, with Vitest.** Considered seriously and would be the next step if pain emerges. Rejected for v1 because the API shape is still being confirmed; tests written now would need to be rewritten after recon, defeating the safety-net purpose.

**Component tests with Vue Test Utils on top of unit tests.** Rejected as overkill for a dashboard with three primary view states (loaded, loading, error). The render output is straightforward enough that visual inspection during development beats writing assertions about DOM structure.

**Full pyramid with Playwright E2E.** Rejected because end-to-end testing against ChurchTools would require either a service account (ruled out by ADR — and outside of v1 scope per PRD) or a fixture server mirroring the API. Both are larger projects than the dashboard itself.
