/**
 * What the admin configures, and how it is read back.
 *
 * Every installation-specific value in this extension lives here rather than
 * in the source, so the same ZIP runs at any Royal Rangers Stamm (CLAUDE.md,
 * `docs/design/002-konfigurierbarkeit.md`). That rule has a sharp edge worth
 * stating: **there are no defaults.** `parseSettings` fills absent fields with
 * neutral emptiness, never with the authors' own group ids, role names or fee
 * rates. A fresh installation is unconfigured and says so; it does not quietly
 * behave like somebody else's Stamm.
 */

/** Fee rates, in cents, so the arithmetic stays exact. */
export type FeeConfig = {
    /**
     * One rate per sibling position. **The last entry applies to every further
     * child**, which makes "free from the third onwards" exactly
     * `[x, y, 0]` — no special case for large families, and no undefined
     * behaviour past the end of the ladder.
     */
    childCents: number[];
    /** Own rate for a participant who is themselves a Mitarbeiter. */
    staffCents: number;
    /** Own rate for a Juniorleiter — a leader under 18. */
    juniorLeaderCents: number;
};

export type Settings = {
    // --- Struktur ---
    /** Hauptstamm: access gate, hero card, and one source of staff without a team. */
    gateGroupId: number | null;
    /** The Teilstämme, chosen directly — not derived from the Hauptstamm's children. */
    teilstammIds: number[];
    /** Filters the group pickers for Hauptstamm and Teilstämme. */
    stammGroupTypeIds: number[];
    /** Which child groups of a Teilstamm count as teams. */
    teamGroupTypeIds: number[];

    // --- Zählregeln ---
    /**
     * Roles that count as leaders *in addition* to the ones ChurchTools itself
     * flags as `type: 'leader'`. Empty is a valid configuration, not a gap: it
     * means only ChurchTools' own leadership roles count.
     */
    extraLeaderRoleIds: number[];
    /** Positions that stay visible on a Teilstamm card even when vacant. */
    alwaysShownRoleIds: number[];
    /** Member field behind the Horizont tile. Empty means the tile is off. */
    horizontFieldName: string;

    // --- Beiträge ---
    fees: FeeConfig;
};

/** Nothing configured. Also the fallback for anything unreadable. */
export const EMPTY_SETTINGS: Settings = {
    gateGroupId: null,
    teilstammIds: [],
    stammGroupTypeIds: [],
    teamGroupTypeIds: [],
    extraLeaderRoleIds: [],
    alwaysShownRoleIds: [],
    horizontFieldName: '',
    fees: { childCents: [], staffCents: 0, juniorLeaderCents: 0 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Finite integers only. Anything else in the list is dropped, not coerced. */
function intList(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (entry): entry is number => typeof entry === 'number' && Number.isInteger(entry),
    );
}

function intOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/** A fee amount: a non-negative whole number of cents, or zero. */
function cents(value: unknown): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function centsList(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (entry): entry is number =>
            typeof entry === 'number' && Number.isInteger(entry) && entry >= 0,
    );
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * Read whatever the KV-Store holds into `Settings`, without throwing.
 *
 * The stored object may predate any given field — the live instance has three
 * of them today — so every field is read defensively and absent ones come back
 * empty. Fields the model no longer has, such as the old `beitraegeRoleIds`,
 * are dropped rather than carried.
 */
export function parseSettings(stored: unknown): Settings {
    if (!isRecord(stored)) return EMPTY_SETTINGS;
    const fees = isRecord(stored.fees) ? stored.fees : {};

    return {
        gateGroupId: intOrNull(stored.gateGroupId),
        teilstammIds: intList(stored.teilstammIds),
        stammGroupTypeIds: intList(stored.stammGroupTypeIds),
        teamGroupTypeIds: intList(stored.teamGroupTypeIds),
        extraLeaderRoleIds: intList(stored.extraLeaderRoleIds),
        alwaysShownRoleIds: intList(stored.alwaysShownRoleIds),
        horizontFieldName: text(stored.horizontFieldName),
        fees: {
            childCents: centsList(fees.childCents),
            staffCents: cents(fees.staffCents),
            juniorLeaderCents: cents(fees.juniorLeaderCents),
        },
    };
}

/** The settings without which no tab can show a figure it can stand behind. */
export type RequiredField = 'gateGroupId' | 'teilstammIds' | 'teamGroupTypeIds';

export function missingDashboardFields(settings: Settings): RequiredField[] {
    const missing: RequiredField[] = [];
    if (settings.gateGroupId === null) missing.push('gateGroupId');
    if (settings.teilstammIds.length === 0) missing.push('teilstammIds');
    if (settings.teamGroupTypeIds.length === 0) missing.push('teamGroupTypeIds');
    return missing;
}

export function isDashboardConfigured(settings: Settings): boolean {
    return missingDashboardFields(settings).length === 0;
}

/**
 * The Beitragsabrechnung needs a ladder with at least one rung. A ladder that
 * is free all the way down is a configuration, not an omission — a Stamm that
 * charges nothing has said so.
 */
export function areFeesConfigured(settings: Settings): boolean {
    return settings.fees.childCents.length > 0;
}

/** What the shell knows when it decides which screen to render. */
export type ShellState = {
    /** The configuration could not be read — not the same as "is absent". */
    loadFailed: boolean;
    /** A Hauptstamm group is configured, so membership can be checked at all. */
    hasGateGroup: boolean;
    /** Every required setting is present. */
    configured: boolean;
    /** The viewer passed the membership gate. */
    gateAllowed: boolean;
    /** The viewer asked for the form with `?admin=1`. */
    isAdminRoute: boolean;
};

/**
 * Whether to render the configuration form.
 *
 * Extracted from the template because it is an access decision, and the two
 * ways of getting it wrong are both quiet:
 *
 *  - Showing the form when the configuration merely could not be *read* lets
 *    somebody overwrite a configuration that still exists.
 *  - Showing it ungated whenever something is missing hands the form to
 *    anyone who can reach the bundle, even though a Hauptstamm group is
 *    configured and could have been checked. That is the hole ADR-008 closed
 *    for `?admin=1`, reopened through the back door.
 *
 * The one ungated case is a genuine first run: with no group configured there
 * is nothing to check membership against, and requiring it would lock
 * everybody out for good.
 */
export function shouldShowAdmin(state: ShellState): boolean {
    if (state.loadFailed) return false;
    if (!state.hasGateGroup) return true;
    if (!state.gateAllowed) return false;
    return state.isAdminRoute || !state.configured;
}
