import { ref } from 'vue';
import { loadOrganigram } from './hierarchy';
import { loadFailures } from './rollup';
import type { LoadFailure } from './rollup';
import { COPY } from '@/shared/copy';
import type { Settings } from '@/shared/settings';
import type { OrgNode } from './types';

export type DashboardState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ready'; root: OrgNode; loadedAt: Date; failures: LoadFailure[] }
    /** Read without error, but the configuration selects no team at all. */
    | { phase: 'unconfigured'; message: string }
    | { phase: 'error'; message: string };

export function useDashboard() {
    const state = ref<DashboardState>({ phase: 'idle' });

    async function load(settings: Settings): Promise<void> {
        state.value = { phase: 'loading' };
        try {
            const root = await loadOrganigram(settings);
            const failures = loadFailures(root);
            // Every Teilstamm read, none with a single team: the team types
            // match nothing here. That is a configuration to fix, not a Stamm
            // of zero people.
            if (!failures.length && root.children.every((ts) => !ts.children.length)) {
                state.value = { phase: 'unconfigured', message: COPY.noTeamsInScope };
                return;
            }
            state.value = {
                phase: 'ready',
                root,
                loadedAt: new Date(),
                failures,
            };
        } catch (e) {
            // loadOrganigram itself shouldn't throw — it absorbs per-call
            // failures into errored nodes — but if something genuinely
            // unexpected blows up, surface it as a hard error.
            state.value = {
                phase: 'error',
                message: e instanceof Error ? e.message : COPY.dashboardLoadError,
            };
        }
    }

    return { state, load };
}
