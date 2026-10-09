# ct-rr-organigram

A ChurchTools extension to visualize our Royal Rangers team and leadership structure.

# RR Dashboard — Project Context for Claude Code

This is a ChurchTools extension that renders an organigram dashboard for
"RR Gesamtmitarbeiter" members.

## Required reading before any work

- `docs/PRD.md` — full specification (9 user stories with acceptance criteria)
- `docs/HANDOVER.md` — onboarding note with implementation order
- `docs/screens/screen-1-desktop.png` — visual source of truth (desktop)
- `docs/screens/screen-2-skeleton.png` — loading state
- `docs/screens/screen-3-mobile.png` — mobile layout

When the spec text and a screen disagree, the screen wins.

## Hard rules

- Before writing any extension code, complete "Pre-Implementation Recon"
  in PRD.md against https://rr-demo.church.tools
- All CSS selectors live under `.rr-dashboard-root` (US-8) — no exceptions
- No `localStorage` / `sessionStorage` — use ChurchTools KV-Store
- API calls go through `@churchtools/churchtools-client`, not raw fetch
- **Nothing installation-specific in the source.** This extension is meant to
  run unchanged at any Royal Rangers Stamm using ChurchTools. Group ids, group
  *type* ids, role names or ids, member field names, fee amounts, Teilstamm
  names — all of it is configuration in the KV-Store, chosen by the admin. A
  constant that describes *this* Stamm is a bug, including when it is only a
  default. See `docs/design/002-konfigurierbarkeit.md`.
- **A missing configuration shows the configuration hint, never zeros.** The
  expensive failure here is not a crash, it is a dashboard that renders a
  plausible-looking table for a Stamm it could not read. Required settings
  absent → the hint; optional settings absent → the feature is off, which is a
  statement, not a gap.

## Implementation order (from HANDOVER.md)

Recon → US-8 → US-1 → US-2 → US-3 + US-9 → US-4 → US-5 + US-6 → US-7

## Open decisions that need confirmation

See "Open Questions / TBDs" at the bottom of PRD.md. Don't quietly choose
— ask the user.

## Conventions

- Commit messages: imperative mood ("add feature", not "added feature")
- Keep PRs focused — one logical change per PR
- Keep a feature branch current by **rebasing** it onto `main`, never by
  merging `main` into it
- Land a branch on `main` with a **real merge commit** — never squash. The
  individual commits are what release-please reads for the changelog, and
  what makes a single step revertable on its own
- **Don't give a PR a conventional-commit title.** release-please attributes
  a merge commit via the pull request's title, so a title like
  `feat(x): add the thing` is counted on top of the commit of the same name
  inside it, and the change is listed twice in `CHANGELOG.md`. Write the title
  as a plain sentence — "Jahresmeldung: Zeilen-Summen und Mitarbeiter ohne
  Team" — and let the commits carry the prefixes
