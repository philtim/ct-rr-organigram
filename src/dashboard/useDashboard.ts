import { ref } from 'vue';
import { hasAnyError, loadOrganigram } from './hierarchy';
import type { OrgNode } from '@/shared/types';

export type DashboardState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ready'; root: OrgNode; loadedAt: Date; hasErrors: boolean }
    | { phase: 'error'; message: string };

export function useDashboard() {
    const state = ref<DashboardState>({ phase: 'idle' });

    async function load(gateGroupId: number, teilstammIds?: number[]): Promise<void> {
        state.value = { phase: 'loading' };
        try {
            const root = await loadOrganigram(gateGroupId, teilstammIds);
            state.value = {
                phase: 'ready',
                root,
                loadedAt: new Date(),
                hasErrors: hasAnyError(root),
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

/** Format a Date as "HH:MM" (24h, leading zeros). */
export function formatTimestamp(d: Date): string {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
}
