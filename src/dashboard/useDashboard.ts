import { ref } from 'vue';
import { loadOrganigram } from './hierarchy';
import { loadFailures } from './rollup';
import type { LoadFailure } from './rollup';
import type { Settings } from '@/shared/settings';
import type { OrgNode } from './types';

export type DashboardState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ready'; root: OrgNode; loadedAt: Date; failures: LoadFailure[] }
    | { phase: 'error'; message: string };

export function useDashboard() {
    const state = ref<DashboardState>({ phase: 'idle' });

    async function load(settings: Settings): Promise<void> {
        state.value = { phase: 'loading' };
        try {
            const root = await loadOrganigram(settings);
            state.value = {
                phase: 'ready',
                root,
                loadedAt: new Date(),
                failures: loadFailures(root),
            };
        } catch (e) {
            // loadOrganigram itself shouldn't throw — it absorbs per-call
            // failures into errored nodes — but if something genuinely
            // unexpected blows up, surface it as a hard error.
            state.value = {
                phase: 'error',
                message: e instanceof Error ? e.message : 'Daten konnten nicht geladen werden.',
            };
        }
    }

    return { state, load };
}
