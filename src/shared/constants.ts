/**
 * Centralized constants and copy strings.
 * UI strings live here (German only in v1) so future i18n is a one-file change.
 */

export const EXTENSION_KEY = import.meta.env.VITE_KEY;

export const KV_CATEGORY_SHORTY = 'settings';
export const KV_GATE_GROUP_ID_FIELD = 'gateGroupId';

/** Hard timeout per outbound API call (US-5 non-functional req). */
export const API_TIMEOUT_MS = 30_000;

/** UI copy. */
export const COPY = {
    appTitle: 'RR Mitarbeiter-Dashboard',
    refresh: 'Aktualisieren',
    timestampPrefix: 'Stand: ',
    accessDenied: 'Du hast keinen Zugriff auf das RR Mitarbeiter-Dashboard.',
    partialErrorToast: 'Einige Daten konnten nicht geladen werden.',
    loading: 'Lädt …',
    // Role-based labels. Hauptstamm hero splits leaders into two buckets:
    //   "Leiter" = role.name === "Leiter"  (Hauptstammleiter / Hauptstammwart)
    //   "Co-Leiter" = role.name === "Co-Leiter" (Stammleiter / Stammwart / Stammhelfer)
    // Teilstamm cards label their own leader list (Stammleiter/wart) and
    // the rolled-up team leader count distinctly.
    hauptstammLeader: 'Leiter',
    hauptstammCoLeader: 'Co-Leiter',
    teilstammLeader: 'Stammleiter/Stammwart',
    teamleiterStat: 'Teamleiter',
    leiterStat: 'Leiter',
    mitgliederStat: 'Teilnehmer',
    gesamtStat: 'Gesamt',
} as const;
