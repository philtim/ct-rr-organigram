# ct-rr-organigram

A ChurchTools extension that visualizes the Royal Rangers staff and leadership structure as a three-level organigram (Hauptstamm → Teilstämme → Teams). See `docs/PRD.md` for the full specification and `docs/screens/` for the visual reference.

## For end users (admins installing the extension)

1. Download the latest `*.zip` from the [Releases](https://github.com/philtim/ct-rr-organigram/releases) page.
2. In ChurchTools, go to **Admin → Extensions**, upload the ZIP, and enable the extension.
3. Open **Admin → Extensions → Extension Settings → RR Mitarbeiter-Dashboard** and pick the Hauptstamm group from the list. The selection is stored in the extension's KV-Store.
4. Members of that group will now see the dashboard in the main menu under **RR Mitarbeiter-Dashboard**.

The extension reads its hierarchy at runtime, so no group names or IDs are baked into the build — the same ZIP works on any installation.

## For developers

### Prerequisites

- Node.js 22 or newer (CI runs against 22).
- A ChurchTools instance to develop against — `rr-demo.church.tools` or similar.

### Setup

```bash
npm install
cp .env-example .env       # then fill in VITE_BASE_URL / VITE_USERNAME / VITE_PASSWORD
npm run dev
```

CORS note: enable cross-origin requests from `http://localhost:5173` in your ChurchTools instance under **System → Integrations → API → CORS**. On Safari you may need a Vite proxy + local HTTPS — see the [boilerplate README](https://github.com/churchtools/extension-boilerplate) for details.

### Scripts

- `npm run dev` — Vite dev server with hot reload.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the production build locally.
- `npm run lint` — ESLint over `src/`.
- `npm run typecheck` — `vue-tsc --noEmit`.
- `npm run check` — lint + typecheck + build (what CI runs).
- `npm run deploy` — build and package into `releases/*.zip`.

### Cutting a release

Releases are driven by [release-please](https://github.com/googleapis/release-please). Use [conventional commit](https://www.conventionalcommits.org/) prefixes on `main` (`feat:`, `fix:`, `feat!:` for breaking changes, `chore:` is ignored) and release-please maintains a rolling **release PR** titled `chore(main): release X.Y.Z` that bumps `package.json` and writes `CHANGELOG.md`. Merge that PR when you want to ship — release-please creates the tag + GitHub release, and the same workflow then builds the ZIP, attaches it to the release, and uploads it to the **rr-demo test instance**. Live customer instances are updated manually from the GitHub release.

The auto-deploy step needs two repo secrets: `CT_DEMO_BASE_URL` (e.g. `https://rr-demo.church.tools`) and `CT_DEMO_LOGIN_TOKEN` (a personal API token from CT under **Personal settings → Login & Security**). The workflow self-bootstraps: if no custom module with `shorty=rr-dashboard` exists, it creates one before uploading.

### Project layout

Per [ADR-004](docs/adr/004-module-structure.md):

```
src/
├── main.ts                       # boot, mount Vue app
├── App.vue                       # top-level shell (inside .rr-dashboard-root)
├── gate/                         # US-1: access check
├── dashboard/                    # US-3, US-4, US-5, US-6, US-7, US-9
├── admin/                        # US-2: pick Hauptstamm group
└── shared/
    ├── api.ts                    # ChurchTools client wrapper (ADR-005)
    ├── kv-store.ts               # KV-store helpers from boilerplate
    ├── ct-types.d.ts             # ChurchTools API types
    ├── reset.css                 # dev-only host-style simulation
    ├── constants.ts              # extension key, KV schema, copy strings
    └── types.ts                  # shared domain types + project aggregates
```

### Architecture decisions

Six accepted ADRs in [`docs/adr/`](docs/adr/):

- ADR-001 Vue 3 with Composition API
- ADR-002 `<style scoped>` + BEM, all under `.rr-dashboard-root` (US-8)
- ADR-003 No automated tests in v1 — TS + ESLint + manual exploration only
- ADR-004 Feature folders + `shared/`
- ADR-005 Thin API wrapper in `src/shared/api.ts`
- ADR-006 ESLint flat config + Prettier + `eslint-plugin-vue`, no Husky

## License

MIT — see [`LICENSE`](LICENSE). Forks for other organizations are explicitly welcome; the extension reads its group hierarchy at runtime, so no code edits are needed for different naming.
