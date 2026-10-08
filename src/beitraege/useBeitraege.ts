import { ref } from 'vue';
import {
    fetchRelationships,
    fetchStaffFromGroups,
    fetchTeamMembers,
    resolveTeams,
} from '@/shared/rr/rr.api';
import { fetchLeaderRoleIds } from '@/shared/roles';
import { groupFamilies } from '@/shared/rr/families';
import { assignFees, summarize } from '@/shared/rr/fee-tiers';
import { summarizeDataQuality } from '@/shared/rr/data-quality';
import type { DataQuality } from '@/shared/rr/data-quality';
import type { FeeTotals } from '@/shared/rr/fee-tiers';
import { DEFAULT_FEE_CONFIG } from '@/shared/rr/types';
import type { FeeConfig } from '@/shared/rr/types';

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

    async function load(
        gateGroupId: number,
        teilstammIds: number[],
        config: FeeConfig = DEFAULT_FEE_CONFIG,
    ): Promise<void> {
        state.value = { phase: 'loading' };
        try {
            // No fallback to "every child of the Hauptstamm" on purpose. The
            // organigram can afford to guess; a sum cannot. On the live
            // instance that guess would pull in a Teilstamm the organigram
            // deliberately leaves out, adding 25 people to a total nobody
            // would notice was wrong.
            if (teilstammIds.length === 0) {
                state.value = {
                    phase: 'error',
                    message:
                        'Es sind keine Teilstämme konfiguriert. Ohne diese Auswahl steht ' +
                        'nicht fest, welche Teams zur Abrechnung gehören — bitte zuerst in ' +
                        'der Konfiguration festlegen.',
                };
                return;
            }

            const teams = await resolveTeams(teilstammIds);
            if (teams.length === 0) {
                state.value = {
                    phase: 'error',
                    message:
                        'Unter den konfigurierten Teilstämmen wurden keine Teams gefunden. ' +
                        'Bitte die Teilstamm-Auswahl in der Konfiguration prüfen.',
                };
                return;
            }

            const leaderRoleIds = await fetchLeaderRoleIds();
            const [{ participants, staffPersonIds }, groupLeaderIds] = await Promise.all([
                fetchTeamMembers(teams, leaderRoleIds),
                fetchStaffFromGroups([gateGroupId, ...teilstammIds], leaderRoleIds),
            ]);
            for (const id of groupLeaderIds) staffPersonIds.add(id);

            const personIds = participants.map((p) => p.personId);
            const relationships = await fetchRelationships(personIds);

            const families = groupFamilies(participants, relationships);
            const assignments = assignFees(participants, families, staffPersonIds, config);

            // Leader status takes precedence over participant status, exactly
            // as `hierarchy.ts` resolves it for the organigram's tiles.
            const staffParticipants = participants.filter((p) =>
                staffPersonIds.has(p.personId),
            ).length;

            state.value = {
                phase: 'ready',
                result: {
                    totals: summarize(assignments, families),
                    leaders: staffPersonIds.size,
                    members: participants.length - staffParticipants,
                    quality: summarizeDataQuality(participants, relationships),
                    config,
                    teamCount: teams.length,
                    families: families.length,
                    loadedAt: new Date(),
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

    return { state, load };
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
