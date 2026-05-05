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

## Implementation order (from HANDOVER.md)

Recon → US-8 → US-1 → US-2 → US-3 + US-9 → US-4 → US-5 + US-6 → US-7

## Open decisions that need confirmation

See "Open Questions / TBDs" at the bottom of PRD.md. Don't quietly choose
— ask the user.

## Conventions

- Commit messages: imperative mood ("add feature", not "added feature")
- Keep PRs focused — one logical change per PR
