import { ref } from 'vue';
import { loadJahresmeldung } from './jahresmeldung.api';
import { tally } from './tally';
import type { Tally } from './tally';
import { COPY } from '@/shared/constants';

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

    async function load(gateGroupId: number, teilstammIds: number[]): Promise<void> {
        state.value = { phase: 'loading' };
        try {
            // No fallback to "every child of the Hauptstamm", for the reason
            // the Beitragsabrechnung gives: the organigram can afford to
            // guess, a sum cannot. Unfiltered, the children include Merkmal
            // and Maßnahme groups that would each become a row and count
            // their members a second time.
            if (teilstammIds.length === 0) {
                state.value = { phase: 'error', message: COPY.jahresmeldungNoTeilstaemme };
                return;
            }

            const { people, rows, ohneTeamIncomplete, teamCount } = await loadJahresmeldung(
                gateGroupId,
                teilstammIds,
            );

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
