# ADR-012: No Web Workers — the host CSP refuses them

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** [bitte ergänzen]

## Context

The .xlsx export shipped in 1.9.0 (ADR-010) failed on the live instance the
first time anyone pressed the button:

```
Content-Security-Policy: The page's settings blocked a worker script
(worker-src) at blob:https://jms-altensteig.church.tools/b0c7f75b-… from
being executed because it violates the following directive:
"child-src * https://data"
```

ChurchTools serves the extension under a CSP whose `child-src` is `*`, and
`worker-src` falls back to `child-src`. A bare `*` matches network schemes
only — not `blob:`, `data:` or `filesystem:` — so a worker started from a blob
URL is refused. This is the host's policy; the extension cannot change it.

`write-excel-file`'s browser build zips through `fflate`'s asynchronous `zip()`,
which spawns exactly such a worker. `fflate` wraps the constructor in no
try/catch and has no fallback, so the refusal surfaces as a failed export rather
than a slow one.

Two properties of the bug matter more than the bug:

- **It is size-dependent.** `fflate` compresses a file inline when it is under
  160 kB and only reaches for a worker above that. Our synthetic fixtures
  produce a ~12 kB sheet; the live Stamm's 305 participants produce ~256 kB. The
  export was therefore correct on every fixture and broken on the only data that
  matters.
- **Node cannot reproduce it.** `fflate`'s `exports` map resolves the `node`
  condition to a build that compresses via `node:worker_threads`, and Node has
  no CSP. Every verification run before release — including a LibreOffice
  recalculation of a real 305-row workbook — exercised a code path the browser
  never takes.

Those two together are why four green commits, a passing CI and a verified
workbook still shipped a feature that could not run.

## Decision

**No shipped chunk may construct a Web Worker.** For the export specifically,
`fflate`'s asynchronous `zip()` is replaced by a synchronous one:
`src/beitraege/fflate-sync.ts` re-exports `fflate`'s surface and overrides
`zip()` with a `zipSync()`-backed implementation, and `vite.config.ts` aliases
bare `fflate` to it.

The alias is anchored (`/^fflate$/`) because an unanchored alias also matches
subpaths and would redirect the shim's own `fflate/browser` import to itself.
The shim reaches `fflate` only through the public `./browser` subpath — no
reaching into package internals, which the deliberately narrow `exports` map of
`write-excel-file` would have forced had we patched that instead.

## Consequences

- **The export blocks the main thread while compressing.** Measured at a few
  tens of milliseconds for the live payload, once per export, on a button the
  user already expects to take a moment. That is the price, and it is the right
  side of the trade: a brief freeze beats a dead button.
- **The lazy chunk got smaller**, 19.52 → 18.65 kB gzip, because the asynchronous
  deflate path and its worker bootstrap are now tree-shaken out.
- **The constraint is enforced, not remembered.** `scripts/check-bundle.js`
  fails the build if `new Worker(` appears in any chunk, and
  `src/beitraege/fflate-sync.test.ts` compresses a 400 kB payload with
  `globalThis.Worker` replaced by a throwing stub — the shape of the real
  refusal. Both were confirmed to fail without the fix before being trusted.
- **This applies to every future dependency**, not just this one. Anything that
  moves work to a worker — a PDF generator, an image pipeline, a parser — is
  unusable here unless the worker is served from the extension's own origin
  rather than a blob.
- **Verification in Node is not verification.** Where a library's behaviour
  depends on the `browser`/`node` export condition, the browser condition has to
  be exercised explicitly, or the check is testing different code than ships.

## Alternatives considered

- **Serve a real worker file from the extension's origin.** `child-src *` would
  permit it. But `fflate` offers no way to supply a worker URL, so this means
  forking it — a permanent maintenance cost to regain an optimisation worth
  tens of milliseconds.
- **Patch `write-excel-file` to use its own `generateXlsxFileSync`.** The sync
  path already exists in the package and the browser entry merely chooses the
  async one. But it is not reachable: the `exports` map publishes only
  `./node`, `./browser`, `./universal` and `./utility`, so this needs either
  `patch-package` or an alias into the package's internals. Swapping the zip
  backend through `fflate`'s public API is the smaller, more stable surface.
- **Replace the library.** The defect is in one function of its zip backend, not
  in its design, and ADR-010's reasoning for choosing it is untouched. Replacing
  it would be a much larger change for the same outcome.
- **Keep the async path and accept the failure above 160 kB.** Not viable: the
  live data is above the threshold, which is the entire point of the feature.
