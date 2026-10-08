/**
 * Centralized constants and copy strings.
 * UI strings live here (German only in v1) so future i18n is a one-file change.
 */

export const EXTENSION_KEY = import.meta.env.VITE_KEY;

export const KV_CATEGORY_SHORTY = 'settings';
export const KV_GATE_GROUP_ID_FIELD = 'gateGroupId';

/** Hard timeout per outbound API call (US-5 non-functional req). */
export const API_TIMEOUT_MS = 30_000;

/**
 * Role names (lowercased) that count as "Leiter" in the stat tiles,
 * beyond ChurchTools' built-in `role.isLeader === true` flag. Matches
 * the auto-membership rule of the "RR Mitarbeiter" group on the live
 * instance, which considers everyone with a Mitarbeiter/Teamhelfer/
 * Organisator role on any RR group an MA — even when the role itself
 * has isLeader=false.
 */
export const LEADER_ROLE_NAMES: ReadonlySet<string> = new Set([
    'leiter',
    'co-leiter',
    'coleiter',
    'mitarbeiter',
    'teamhelfer',
    'organisator',
]);

/**
 * Leadership roles that stay visible on a Teilstamm card even when nobody
 * holds them — a vacant Stammwart is worth seeing, a missing Stammhelfer is
 * not. ChurchTools has no flag that tells a vacancy apart from an optional
 * position, so this list is deliberately hardcoded (decision 2026-10-02).
 * Compare lowercased; this is the single place to adapt for another
 * installation's role names.
 */
export const ALWAYS_SHOWN_LEADER_ROLES: ReadonlySet<string> = new Set(['stammleiter', 'stammwart']);

/** UI copy. */
export const COPY = {
    appTitle: 'RR Mitarbeiter-Dashboard',
    refresh: 'Aktualisieren',
    timestampPrefix: 'Stand: ',
    accessDenied: 'Du hast keinen Zugriff auf das RR Mitarbeiter-Dashboard.',
    partialErrorToast: 'Einige Daten konnten nicht geladen werden.',
    loading: 'Lädt …',
    // Leader lists are labelled with the group role's own name, straight from
    // ChurchTools — see `groupLeadersByRole` in dashboard/counts.ts. The labels
    // below are only for the stat tiles and the "?" error state.
    teamleiterStat: 'Teamleiter',
    leiterStat: 'Leiter',
    mitgliederStat: 'Teilnehmer',
    gesamtStat: 'Gesamt',
    horizontStat: 'Benötigte Horizonte',
    /** Shown in place of a name when a leadership position is unfilled. */
    vacantRole: 'nicht besetzt',
    // Tabs (ADR-007).
    tabOrganigram: 'Organigramm',
    tabBeitraege: 'Beitragsabrechnung',
    beitraegeTitle: 'RR Beitragsabrechnung',
    beitraegeAccessDenied:
        'Die Beitragsabrechnung ist der Hauptstammleitung vorbehalten. Falls du Zugriff ' +
        'brauchst, wende dich an den Stammleiter.',
    beitraegePlaceholder:
        'Die Kennzahlen und der Excel-Export folgen. Diese Ansicht zeigt ausschließlich ' +
        'Summen — Namen, Geburtsdaten und Adressen stehen nur in der Export-Datei.',
} as const;
