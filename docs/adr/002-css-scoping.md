# ADR-002: CSS scoping — `<style scoped>` + BEM naming

- **Status:** Accepted
- **Date:** 2026-05-05
- **Decided by:** [bitte ergänzen]

## Context

The extension renders inside the ChurchTools host UI. Any unscoped CSS would leak into the host (and host CSS would leak into the extension). US-8 of the PRD makes this a P0 requirement: all selectors must be scoped under a single root class (`.rr-dashboard-root`), and `body` must never be styled.

The community extension `karteileichen` learned this the hard way — their v1.0.5 release was largely a CSS-scoping fix. They added attribute fallbacks (`[data-ct-extension="..."]`), high-specificity modal overrides, and explicitly avoided global `body` classes at runtime.

ADR-001 commits us to Vue 3, which provides `<style scoped>` — a runtime mechanism that adds a unique attribute selector (e.g. `[data-v-abc123]`) to every rule, isolating styles to the component that declared them.

## Decision

We use **Vue's `<style scoped>` for component-level isolation, combined with BEM (Block-Element-Modifier) naming inside each scope**, all wrapped under the project-wide `.rr-dashboard-root` class on the application root element.

The three layers, from outside in:

1. **Project scope:** `.rr-dashboard-root` on the mount point. The only selector that touches the host's DOM. Provides the safety net required by US-8 even if a developer accidentally writes an unscoped style.
2. **Component scope:** `<style scoped>` in every `.vue` file. Vue's compiler attribute-tags every selector so it cannot match outside the component.
3. **Naming:** BEM inside each component (e.g. `.teilstamm-card__header--highlighted`). Keeps selectors readable and predictable.

## Consequences

**What this enables:**

- Belt-and-suspenders isolation: the project-wide root class catches anything that escapes component scope; component scope catches anything that escapes BEM intent.
- Readable selectors: BEM names describe the structure (`block__element--modifier`) without obscure CSS-in-JS hashes.
- No build-step changes needed: `<style scoped>` is a Vue compiler feature, BEM is just a naming convention.
- Straightforward debugging: every selector in DevTools traces back to a specific component and a specific role within it.

**What this costs:**

- Slight verbosity in selector names (BEM tends to produce longer class names than utility-first CSS).
- `<style scoped>` does not penetrate child components or `<slot>` content. When we need to style content rendered by a child component, we'll use Vue's `:deep(...)` pseudo-class — used sparingly and only where unavoidable.
- BEM discipline is a team convention, not enforced by tooling. Code review must catch violations.

**What we'd reconsider for:**

- A move to a CSS-in-JS solution (e.g. Vanilla Extract, Pinceau) if styling complexity grows beyond what BEM can express cleanly.
- Tailwind, if the project ever absorbs a design system that ships Tailwind tokens.

## Alternatives considered

**Tailwind CSS.** Utility-first, fast to write, popular. Rejected because the design (PRD §Visual Designs) is a small, well-defined component set with no active design-system pressure. Adding Tailwind means a build-step plugin, learning curve for forkers who don't know Tailwind, and a larger CSS bundle for utilities we'd use only a fraction of.

**CSS Modules.** Auto-scoped, framework-agnostic. Rejected because Vue's `<style scoped>` already provides equivalent isolation natively, without the `styles.foo` import boilerplate. Two scoping mechanisms doing the same job is one too many.

**No framework-level scoping, only the `.rr-dashboard-root` prefix.** Rejected because relying on a single root prefix is fragile: one accidental top-level selector and styles leak. `<style scoped>` provides defense in depth at zero added cost.

**Plain BEM without `<style scoped>`.** Rejected for the same reason — defense in depth is cheap with Vue, and trusting only a naming convention has burned other extensions (see karteileichen v1.0.5).
