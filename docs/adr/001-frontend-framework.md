# ADR-001: Frontend framework — Vue 3 with Composition API

- **Status:** Accepted
- **Date:** 2026-05-05
- **Decided by:** [bitte ergänzen]

## Context

The RR Dashboard extension renders a three-level organigram with reactive data: a Hauptstamm hero card, five Teilstamm cards, and embedded team chips inside each. The view re-renders on initial load, on manual refresh, and partially when individual API calls fail (showing "?" placeholders). An admin configuration screen with multi-select form state is also part of the deliverable.

The ChurchTools extension boilerplate ships as a framework-agnostic Vite + TypeScript shell. We can drop in any framework or stay vanilla. Two community extension repositories illustrate the practical paths: `CEuchner/churchtools_karteileichen` (vanilla TypeScript, ~890 lines in `main.ts` before refactoring) and `aschojz/churchtools-extension-flow` (Vue 3 with Composition API, used for a node-based editor).

## Decision

We use **Vue 3 with the Composition API** as the frontend framework for this extension.

## Consequences

**What this enables:**

- Reactive state out of the box: `ref()` and `reactive()` handle re-renders for the dashboard and admin form without manual DOM updates.
- Single-file components (`.vue`) co-locate template, script, and scoped styles per component — natural fit for the feature-folder structure (ADR-004).
- `<style scoped>` provides component-level CSS isolation, complementing the project-wide root-class scoping required by US-8 (see ADR-002).
- Composition API (over Options API) keeps logic reusable: composables can be shared across the dashboard and admin features without inheritance ceremony.

**What this costs:**

- A small bundle-size overhead vs. vanilla TS (~30 KB gzipped for Vue runtime). Acceptable for a desktop-first dashboard.
- Slight learning curve for any contributor unfamiliar with Vue 3, though the Composition API is straightforward for anyone with React hooks experience.
- We're tied to Vue's tooling ecosystem (`@vitejs/plugin-vue`, `vue-tsc` for type-checking templates, `eslint-plugin-vue` — see ADR-006).

**What we'd reconsider for:**

- A future ChurchTools host that ships Vue at runtime and asks extensions to use the same instance (currently each extension bundles its own).
- A move to Server Components or other architectures incompatible with classic SPA-style frameworks.

## Alternatives considered

**Vanilla TypeScript.** Lightest option, no framework runtime. Rejected because the dashboard's reactive needs (initial load, refresh, per-box error states, admin form) would push us toward hand-rolled state management and DOM diffing — exactly what frameworks solve. The karteileichen example shows how this scales: their `main.ts` reached 890 lines before they refactored.

**React with hooks.** Functionally equivalent to Vue 3 Composition API for this project. Rejected because Vue 3 has a slightly smaller runtime, single-file components fit feature-folder organization more cleanly than separate JSX/CSS files, and the team has prior Vue experience.

**Svelte.** Smallest bundle, simplest reactivity model. Rejected because the ChurchTools-extension community's Vue/vanilla example is broader, and the smaller ecosystem (fewer third-party libraries known to work with the boilerplate) raises integration risk for limited gain on a small project.
