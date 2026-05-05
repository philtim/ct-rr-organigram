# ADR-006: Linting and formatting — ESLint flat config + Prettier + eslint-plugin-vue

- **Status:** Accepted
- **Date:** 2026-05-05
- **Decided by:** [bitte ergänzen]

## Context

Code-quality tooling for a 2026 Vue 3 + TypeScript project has two main paths:

- **Classic stack:** ESLint + Prettier + framework-specific plugins. Mature, ubiquitous, well-documented; pays the cost of multiple config files and the historical "Prettier conflict dance" with ESLint.
- **Unified stack:** Biome — a Rust-based all-in-one linter+formatter. 10–50× faster, single config, automatic ESLint config migration. Used in production at Vercel, Coinbase, Discord, Slack, Astro.

The single fact that decides this for us: **as of 2026, Biome does not parse `.vue` files**. Its lint rules apply only to `<script>` blocks via separate JS/TS handling, not to `<template>` markup. The Vue-specific lint rules (unused props, missing `key` on `v-for`, `v-html` warnings, accessibility on Vue templates) live in `eslint-plugin-vue` and have no Biome equivalent on the roadmap that's actually shipped.

ADR-001 commits us to Vue 3. That commitment makes Biome a partial solution.

A separate question: pre-commit hooks (Husky + lint-staged) vs. CI-only enforcement. The team's prior practice was "Husky for everything"; modern practice is moving toward editor-on-save + CI as the gate, with hooks reserved for cases where editor configuration can't be assumed (large teams, secrets scanning).

## Decision

We use **ESLint flat config + Prettier + `eslint-plugin-vue`**, with the following enforcement layers:

1. **Editor (instant, automatic):** lint-on-save and format-on-save via VS Code extensions for ESLint and Prettier. Catches issues at write time.
2. **Local on demand:** `npm run check` runs the full lint + type-check + build. Available, not enforced.
3. **CI (authoritative):** GitHub Actions runs the same checks on every push. Branch protection rules require CI to pass before merge.

We **do not** add Husky, lint-staged, or any pre-commit hooks. CI is the gate; the editor is the safety net during writing.

Concrete tooling:

- **ESLint** with flat config (`eslint.config.js`).
- **Plugins:** `eslint-plugin-vue` (recommended ruleset), `@vue/eslint-config-typescript` for TypeScript-aware Vue rules, `@typescript-eslint/eslint-plugin` for general TS rules.
- **Prettier** with default settings (resist bikeshedding `printWidth`, tab vs. spaces, etc. — the point of Prettier is to stop having those conversations).
- **`eslint-config-prettier`** to disable ESLint rules that conflict with Prettier's formatting.
- **Vue-tsc** for type-checking `.vue` template expressions in CI.

## Consequences

**What this enables:**

- Vue template linting catches Vue-specific bugs at write time and in CI — the most valuable lint coverage for this stack.
- Modern flat config (`eslint.config.js`) avoids the deprecated `.eslintrc` format that's being phased out.
- No `--no-verify` muscle memory: nothing to bypass, nothing to skip during rebases or amends.
- Forkers cloning the repo don't have to install or trust Husky to start working — `npm install` and they're set.
- A clean upgrade path if Biome ships full Vue support: ADR-006 gets superseded, the team migrates with `biome migrate eslint --write`.

**What this costs:**

- Multiple config files (`eslint.config.js`, `.prettierrc`, plus IDE settings). The "config drift" problem is real but small at this project's scale.
- Slower than Biome — ESLint on this project will run in the 1–10 second range, which is fine for CI but slower than what Biome would deliver.
- Discipline burden: the team must keep ESLint, Prettier, the Vue plugin, and the TypeScript plugin in sync across major-version upgrades. ESLint's flat config migration was painful for many projects in 2024-2025; future migrations may also require effort.
- No pre-commit safety net for developers who haven't configured editor-on-save. Mitigation: the `README.md` mentions the recommended VS Code extensions; CI catches anything that escapes the editor.

**What we'd reconsider for:**

- Biome shipping full Vue template linting (currently on the roadmap, not shipped). At that point, this ADR gets superseded by an ADR-XXX that migrates to Biome.
- A team-size or velocity change where developer environment heterogeneity makes pre-commit hooks earn their keep.

## Alternatives considered

**Biome only.** Rejected because Vue template linting is unsupported. Accepting that gap means losing the most valuable lint coverage for a Vue project, in exchange for speed gains that don't matter at our scale.

**Hybrid: Biome for formatting, ESLint for linting.** Rejected because it adds back the "two tools" complexity that was supposed to be the entire reason to switch. The Prettier-format vs. Biome-format difference is approximately 3% of edge cases; not worth the operational complexity.

**ESLint + Prettier + Husky (the team's prior practice).** Rejected because pre-commit hooks have accumulated real downsides: they slow down committing, they're easily bypassed via `--no-verify`, they make rebases painful, and editor-on-save catches almost everything they would catch. CI is the authoritative gate; pre-commit was always belt-and-braces.

**Just Prettier on save, no lint blocking.** Rejected because Vue-specific lint rules catch real bugs (missing `key` on `v-for`, mutating props, etc.) that no formatter would catch.

**Pre-push hook instead of pre-commit.** Considered briefly. Rejected because if the developer has editor-on-save configured, the pre-push hook adds friction without much marginal value. CI on push covers the same ground a few seconds later.
