import { ref } from 'vue';
import { loadJahresmeldung } from './jahresmeldung.api';
import { tally } from './tally';
import type { Tally } from './tally';
import { COPY } from '@/shared/copy';
import type { Settings } from '@/shared/settings';

export type JahresmeldungResult = {
    tally: Tally;
    /** How many team groups the figures cover — the scope, made visible. */
    teamCount: number;
    loadedAt: Date;
};

export type JahresmeldungState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ready'; result: JahresmeldungResult }
    /** Something the table depends on is not configured — the hint, never zeros. */
    | { phase: 'unconfigured'; message: string }
    | { phase: 'error'; message: string };

/**
 * Loads the scope and reduces it to the table.
 *
 * Runs on mount, so the organigram never pays for these requests (ADR-007),
 * and caches nothing between mounts: the figures are a statement about right
 * now, and a stale number filed with the Bund is worse than a second of
 * loading.
 */
export function useJahresmeldung() {
    const state = ref<JahresmeldungState>({ phase: 'idle' });

    async function load(settings: Settings): Promise<void> {
        state.value = { phase: 'loading' };
        try {
            // No fallback to "every child of the Hauptstamm", for the reason
            // the Beitragsabrechnung gives: the organigram can afford to
            // guess, a sum cannot. Unfiltered, the children include Merkmal
            // and Maßnahme groups that would each become a row and count
            // their members a second time.
            if (settings.gateGroupId === null || settings.teilstammIds.length === 0) {
                state.value = { phase: 'unconfigured', message: COPY.jahresmeldungNoTeilstaemme };
                return;
            }

            const { people, rows, ohneTeamIncomplete, teamCount } =
                await loadJahresmeldung(settings);
            // Nothing failed and still no team: the team types match nothing
            // under these Teilstämme. A table of zeros would be filed as one.
            if (teamCount === 0 && !ohneTeamIncomplete && !rows.some((r) => r.incomplete)) {
                state.value = { phase: 'unconfigured', message: COPY.noTeamsInScope };
                return;
            }

            state.value = {
                phase: 'ready',
                result: {
                    tally: tally(people, rows, ohneTeamIncomplete),
                    teamCount,
                    loadedAt: new Date(),
                },
            };
        } catch (e) {
            console.error('[rr-dashboard] Jahresmeldung failed to load:', e);
            state.value = {
                phase: 'error',
                message: e instanceof Error ? e.message : COPY.jahresmeldungLoadError,
            };
        }
    }

    return { state, load };
}
