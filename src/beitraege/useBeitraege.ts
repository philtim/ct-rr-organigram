import { ref } from 'vue';
import {
    fetchRelationships,
    fetchStaffFromGroups,
    fetchTeamMembers,
    resolveTeams,
} from './beitraege.api';
import { computeBeitraege } from './compute';
import { buildExemptList } from './exempt';
import type { ExemptGroup } from './exempt';
import { dataQualityFlags } from './data-quality';
import type { DataQuality } from './data-quality';
import type { FeeTotals } from './fee-tiers';
import { getInstanceOrigin } from '@/shared/api';
import { nextDueDate } from '@/shared/dates';
import { fetchLeaderRoleIds, leaderRuleOf } from '@/shared/roles';
import { areFeesConfigured } from '@/shared/settings';
import type { FeeConfig, Settings } from '@/shared/settings';
import type { FeeAssignment, Relationship, RrParticipant } from './types';
import { COPY } from '@/shared/copy';

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
    /**
     * The due date the figures were computed for. Fixed at load, so a tab
     * left open past midnight on the due date shows, and exports, the date
     * its Juniorleiter split was actually made against.
     */
    dueDate: Date;
};

export type BeitraegeState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ready'; result: BeitraegeResult }
    /** Something the figures depend on is not configured — the hint, never a zero. */
    | { phase: 'unconfigured'; message: string }
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
    dueDate: Date;
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

    /**
     * The exempt people by name, while the list is open, and null otherwise.
     *
     * The one place this view shows names (ADR-011, amended): built from the
     * snapshot on demand rather than kept with the figures, dropped again
     * when the list is closed or the tab reloads, and carrying a name, a team
     * and a family id — no address, no birthday.
     */
    const exemptList = ref<ExemptGroup[] | null>(null);

    async function load(settings: Settings): Promise<void> {
        exemptList.value = null;
        const gateGroupId = settings.gateGroupId;
        const teilstammIds = settings.teilstammIds;
        const config = settings.fees;
        state.value = { phase: 'loading' };
        try {
            // No fallback to "every child of the Hauptstamm" on purpose: that
            // guess would pull in a Teilstamm the organigram deliberately
            // leaves out, adding people to a total nobody would notice was
            // wrong.
            if (gateGroupId === null || teilstammIds.length === 0) {
                state.value = { phase: 'unconfigured', message: COPY.configMissing };
                return;
            }
            // A ladder with no rungs is not "everything free", it is "nobody
            // said". Rendering a total of 0,00 € would look like an answer.
            if (!areFeesConfigured(settings)) {
                state.value = { phase: 'unconfigured', message: COPY.feesNotConfigured };
                return;
            }

            const teams = await resolveTeams(teilstammIds, settings.teamGroupTypeIds);
            if (teams.length === 0) {
                state.value = { phase: 'unconfigured', message: COPY.noTeamsInScope };
                return;
            }

            const leaderRoleIds = await fetchLeaderRoleIds(leaderRuleOf(settings));
            const [{ participants, staffPersonIds }, groupLeaderIds] = await Promise.all([
                fetchTeamMembers(teams, leaderRoleIds),
                fetchStaffFromGroups([gateGroupId, ...teilstammIds], (roleId) =>
                    leaderRoleIds.has(roleId),
                ),
            ]);
            for (const id of groupLeaderIds) staffPersonIds.add(id);
            // Every member of a Sammelgruppe is a Mitarbeiter: should one of
            // them also take part in a team, the staff rate applies.
            const collectionStaff = await fetchStaffFromGroups(
                settings.collectionGroupIds,
                () => true,
            );
            for (const id of collectionStaff) staffPersonIds.add(id);

            const relationships = await fetchRelationships(participants.map((p) => p.personId));

            const loadedAt = new Date();
            const dueDate = nextDueDate(loadedAt);
            const figures = computeBeitraege(
                participants,
                staffPersonIds,
                relationships,
                config,
                dueDate,
            );

            snapshot = {
                participants,
                assignments: figures.assignments,
                relationships,
                stammNames: [...new Set(teams.map((t) => t.stammName).filter(Boolean))].sort(),
                teamCount: teams.length,
                families: figures.families.length,
                config,
                totals: figures.totals,
                quality: figures.quality,
                loadedAt,
                dueDate,
            };

            state.value = {
                phase: 'ready',
                result: {
                    totals: figures.totals,
                    leaders: figures.leaders,
                    members: figures.members,
                    quality: figures.quality,
                    config,
                    teamCount: teams.length,
                    families: figures.families.length,
                    loadedAt,
                    dueDate,
                },
            };
        } catch (e) {
            console.error('[rr-dashboard] Beitragsabrechnung failed to load:', e);
            state.value = {
                phase: 'error',
                message: e instanceof Error ? e.message : COPY.beitraegeLoadError,
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

    function toggleExemptList(): void {
        exemptList.value =
            exemptList.value === null && snapshot
                ? buildExemptList(snapshot.participants, snapshot.assignments)
                : null;
    }

    async function exportXlsx(): Promise<void> {
        if (!snapshot || exportState.value.phase === 'working') return;
        const data = snapshot;
        exportState.value = { phase: 'working' };
        try {
            const [{ buildExportRows }, { buildSheets, exportFileName }, { downloadWorkbook }] =
                await Promise.all([
                    import('./export-rows'),
                    import('./workbook'),
                    import('./xlsx'),
                ]);

            const dueDate = data.dueDate;
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

    return { state, exportState, exemptList, toggleExemptList, load, exportXlsx };
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
