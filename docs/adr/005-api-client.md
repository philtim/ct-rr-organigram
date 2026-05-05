# ADR-005: API client — thin wrapper in `src/shared/api.ts`

- **Status:** Accepted
- **Date:** 2026-05-05
- **Decided by:** [bitte ergänzen]

## Context

The extension talks to ChurchTools through its REST API. Two patterns are common in the community:

- **Direct use:** import `@churchtools/churchtools-client` and call its methods from anywhere.
- **Heavy wrapper:** define a project-specific `ApiClient` class that exposes only the endpoints we need, with project-typed parameters and return values.

Several practical concerns shape the choice:

- ChurchTools' pagination differs per endpoint. The community example `karteileichen` documents that `/events` caps at 100 per page (API max), `/groups` at 200, and `/services` doesn't support pagination at all. A `fetchAllPages()` helper with per-endpoint limits, a `MAX_PAGES` safety guard, and signature-based duplicate detection saved them from infinite loops.
- The exact endpoint shape for the group hierarchy (Recon-2 in the PRD) is still unconfirmed. We need a place to absorb that decision once made.
- We want a single, predictable place where API calls happen — both for "where do I add a new call?" reasons and for the eventual ADR-003 reversal where these become unit-testable.

## Decision

We add a **thin wrapper** in `src/shared/api.ts` that re-exports the official client and adds project-specific helpers.

```ts
// src/shared/api.ts
import { churchtoolsClient } from '@churchtools/churchtools-client';

// Initialize once at boot
export function initApi(baseUrl: string): void {
  churchtoolsClient.setBaseUrl(baseUrl);
}

// Re-export the underlying client so feature code can use it directly
// for one-off calls.
export { churchtoolsClient as ct };

// Helper: fetch all pages of a paginated endpoint with safety guards.
// Each feature passes its own per-endpoint pagination limit.
export async function fetchAllPages<T>(
  url: string,
  options: {
    limit: number;
    maxPages?: number;
  } = { limit: 100, maxPages: 100 },
): Promise<T[]> {
  // Implementation: paginate until empty page or maxPages reached.
  // Detect duplicate signatures (same first-item ID twice in a row) → stop.
}

// Helper: a single shared error type so the toast component can
// display consistent messages regardless of which feature calls failed.
export class ChurchToolsApiError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
```

Feature-level API calls live in each feature's own `*.api.ts` file (per ADR-004) and import from `shared/api.ts`. Example:

```ts
// src/dashboard/dashboard.api.ts
import { ct, fetchAllPages } from '@/shared/api';

export async function getTeamMembers(teamId: number) {
  return fetchAllPages(`/groups/${teamId}/members`, { limit: 200 });
}
```

## Consequences

**What this enables:**

- One init call, one error type, one pagination helper — shared across all features.
- Recon-2's eventual answer (the actual hierarchy endpoint shape) lives in *one* place: `dashboard.api.ts`'s `loadHierarchy()` function. No grep-and-replace across feature code.
- When ADR-003 is reversed and we add unit tests, `fetchAllPages` and `ChurchToolsApiError` are pure-logic units that test naturally.
- Public-fork users can extend the wrapper without modifying the upstream client.

**What this costs:**

- One extra file in the import chain. Trivially small.
- The temptation to grow the wrapper into a heavy abstraction. Code review needs to push back on adding endpoints to the wrapper that have only one caller.

**What we'd reconsider for:**

- A second project that shares the same wrapper code — at that point it might warrant being a separate package.
- A move away from `@churchtools/churchtools-client` if its API changes incompatibly. The wrapper would absorb the migration.

## Alternatives considered

**Direct use of `@churchtools/churchtools-client` everywhere.** Rejected because pagination logic and error handling would duplicate across features. It also gives us no place to absorb the Recon-2 decision cleanly.

**Heavy wrapper: project-defined `ApiClient` class with explicit methods for every endpoint.** Rejected because it inverts the maintenance burden — every new endpoint we want to call requires adding a method to the class first. For a v1 with maybe ten distinct endpoint calls, that overhead doesn't pay off. It also tends to attract premature abstraction (typed return values that drift from the actual API responses).

**Composable instead of module (`useApi()`).** Rejected because the API client is stateless after init — there's nothing to react to and no component lifecycle to bind to. A plain module is simpler.
