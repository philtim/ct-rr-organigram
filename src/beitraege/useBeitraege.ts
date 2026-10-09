import { ref } from 'vue';
import {
    fetchRelationships,
    fetchStaffFromGroups,
    fetchTeamMembers,
    resolveTeams,
} from '@/shared/rr/rr.api';
import { getInstanceOrigin } from '@/shared/api';
import { fetchLeaderRoleIds } from '@/shared/roles';
import { groupFamilies } from '@/shared/rr/families';
import { assignFees, summarize } from '@/shared/rr/fee-tiers';
import { dataQualityFlags, summarizeDataQuality } from '@/shared/rr/data-quality';
import { nextDueDate } from '@/shared/rr/dates';
import type { DataQuality } from '@/shared/rr/data-quality';
import type { FeeTotals } from '@/shared/rr/fee-tiers';
import { ageBucket } from '@/shared/rr/dates';
import { areFeesConfigured } from '@/shared/settings';
import type { FeeConfig, Settings } from '@/shared/settings';
import type { FeeAssignment, Relationship, RrParticipant } from '@/shared/rr/types';
import { COPY } from '@/shared/constants';

export type BeitraegeResult = {
    totals: FeeTotals;
    /**
     * The organigram's two headline counts, computed from the same data by the
     * same rules, so a reader can hold the tabs side by side and have them
     * agree. `participants = members + staffParticipants` — the Mitarbeiter
     * the organigram counts as leaders are participants here, exempt rather
     * than absent.
     */
    leaders: number;
    members: number;
    quality: DataQuality;
    config: FeeConfig;
    /** How many team groups the figures cover — the scope, made visible. */
    teamCount: number;
    families: number;
    loadedAt: Date;
};

export type BeitraegeState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ready'; result: BeitraegeResult }
    | { phase: 'error'; message: string };

export type ExportState = { phase: 'idle' | 'working' } | { phase: 'error'; message: string };

/**
 * What the export needs and the view must not have.
 *
 * Kept deliberately outside the reactive state: a `ref` would be rendered the
 * moment someone writes the wrong `v-for`, and would show up in the Vue
 * devtools of anyone who opens the tab. The figures are reactive; the people
 * are not (ADR-011).
 */
type ExportSnapshot = {
    participants: RrParticipant[];
    assignments: FeeAssignment[];
    relationships: Relationship[];
    stammNames: string[];
    teamCount: number;
    families: number;
    config: FeeConfig;
    totals: FeeTotals;
    quality: DataQuality;
    loadedAt: Date;
};

/**
 * Loads everything the figures need and reduces it to counts.
 *
 * Runs only when the tab is opened — the view mounts on activation, so the
 * organigram never pays for these requests (ADR-007). Nothing is cached
 * between mounts: the numbers are a statement about right now, and a stale
 * total is worse than a second of loading.
 */
export function useBeitraege() {
    const state = ref<BeitraegeState>({ phase: 'idle' });
    const exportState = ref<ExportState>({ phase: 'idle' });
    let snapshot: ExportSnapshot | null = null;

    async function load(settings: Settings): Promise<void> {
        const gateGroupId = settings.gateGroupId;
        const teilstammIds = settings.teilstammIds;
        const config = settings.fees;
        state.value = { phase: 'loading' };
        try {
            // No fallback to "every child of the Hauptstamm" on purpose. The
            // organigram can afford to guess; a sum cannot. On the live
            // instance that guess would pull in a Teilstamm the organigram
            // deliberately leaves out, adding 25 people to a total nobody
            // would notice was wrong.
            if (gateGroupId === null || teilstammIds.length === 0) {
                state.value = { phase: 'error', message: COPY.configMissing };
                return;
            }
            // A ladder with no rungs is not "everything free", it is "nobody
            // said". Rendering a total of 0,00 € would look like an answer.
            if (!areFeesConfigured(settings)) {
                state.value = { phase: 'error', message: COPY.feesNotConfigured };
                return;
            }

            const teams = await resolveTeams(teilstammIds, settings.teamGroupTypeIds);
            if (teams.length === 0) {
                state.value = {
                    phase: 'error',
                    message:
                        'Unter den konfigurierten Teilstämmen wurden keine Teams gefunden. ' +
                        'Bitte die Teilstamm-Auswahl in der Konfiguration prüfen.',
                };
                return;
            }

            const leaderRoleIds = await fetchLeaderRoleIds(new Set(settings.extraLeaderRoleIds));
            const [{ participants, staffPersonIds }, groupLeaderIds] = await Promise.all([
                fetchTeamMembers(teams, leaderRoleIds),
                fetchStaffFromGroups([gateGroupId, ...teilstammIds], leaderRoleIds),
            ]);
            for (const id of groupLeaderIds) staffPersonIds.add(id);

            const personIds = participants.map((p) => p.personId);
            const relationships = await fetchRelationships(personIds);

            const families = groupFamilies(participants, relationships);

            // A Juniorleiter is a leader under 18, so they are already in
            // `staffPersonIds`; the age is what separates the two rates. Only
            // people who are also participants can be billed at all, and those
            // are the ones whose birthday we hold.
            const today = new Date();
            const juniorLeaderPersonIds = new Set(
                participants
                    .filter(
                        (p) =>
                            staffPersonIds.has(p.personId) &&
                            ageBucket(p.birthday, today) === 'minor',
                    )
                    .map((p) => p.personId),
            );

            const assignments = assignFees(
                participants,
                families,
                staffPersonIds,
                juniorLeaderPersonIds,
                config,
            );

            // Leader status takes precedence over participant status, exactly
            // as `hierarchy.ts` resolves it for the organigram's tiles.
            const staffParticipants = participants.filter((p) =>
                staffPersonIds.has(p.personId),
            ).length;

            const totals = summarize(assignments, families, config.childCents.length);
            const quality = summarizeDataQuality(participants, relationships);
            const loadedAt = new Date();

            snapshot = {
                participants,
                assignments,
                relationships,
                stammNames: [...new Set(teams.map((t) => t.stammName).filter(Boolean))].sort(),
                teamCount: teams.length,
                families: families.length,
                config,
                totals,
                quality,
                loadedAt,
            };

            state.value = {
                phase: 'ready',
                result: {
                    totals,
                    leaders: staffPersonIds.size,
                    members: participants.length - staffParticipants,
                    quality,
                    config,
                    teamCount: teams.length,
                    families: families.length,
                    loadedAt,
                },
            };
        } catch (e) {
            console.error('[rr-dashboard] Beitragsabrechnung failed to load:', e);
            state.value = {
                phase: 'error',
                message: e instanceof Error ? e.message : 'Die Daten konnten nicht geladen werden.',
            };
        }
    }

    /**
     * Write the .xlsx from the snapshot the figures were computed from.
     *
     * Deliberately not a second fetch. Re-reading ChurchTools here could
     * produce a file whose totals differ from the figures on screen — somebody
     * joins a team between the two requests and the export silently disagrees
     * with the page that produced it. The snapshot is what the reader saw.
     *
     * The spreadsheet writer and the sheet construction are loaded on first
     * use (ADR-010): nobody who only looks at the figures downloads them.
     */
    async function exportXlsx(): Promise<void> {
        if (!snapshot || exportState.value.phase === 'working') return;
        const data = snapshot;
        exportState.value = { phase: 'working' };
        try {
            const [{ buildExportRows }, { buildSheets, exportFileName }, { downloadWorkbook }] =
                await Promise.all([
                    import('@/shared/rr/export-rows'),
                    import('./workbook'),
                    import('./xlsx'),
                ]);

            const dueDate = nextDueDate(new Date());
            const rows = buildExportRows(
                data.participants,
                data.assignments,
                dataQualityFlags(data.participants, data.relationships),
                dueDate,
            );

            await downloadWorkbook(
                buildSheets(rows, {
                    source: getInstanceOrigin(),
                    loadedAt: data.loadedAt,
                    dueDate,
                    stammNames: data.stammNames,
                    teamCount: data.teamCount,
                    config: data.config,
                    totals: data.totals,
                    quality: data.quality,
                    families: data.families,
                    version: __APP_VERSION__,
                    commit: __APP_COMMIT__,
                }),
                exportFileName(dueDate),
            );
            exportState.value = { phase: 'idle' };
        } catch (e) {
            console.error('[rr-dashboard] Export failed:', e);
            exportState.value = { phase: 'error', message: COPY.feesExportError };
        }
    }

    return { state, exportState, load, exportXlsx };
}

/** Euro with German separators, from exact cents. */
export function formatEuro(cents: number): string {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(cents / 100);
}
