import { ref } from 'vue';
import { loadOrganigram } from './hierarchy';
import type { OrgNode } from '@/shared/types';

export type DashboardState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ready'; root: OrgNode; loadedAt: Date }
    | { phase: 'error'; message: string };

export function useDashboard() {
    const state = ref<DashboardState>({ phase: 'idle' });

    async function load(gateGroupId: number): Promise<void> {
        state.value = { phase: 'loading' };
        try {
            const root = await loadOrganigram(gateGroupId);
            state.value = { phase: 'ready', root, loadedAt: new Date() };
        } catch (e) {
            state.value = {
                phase: 'error',
                message: e instanceof Error ? e.message : 'Daten konnten nicht geladen werden.',
            };
        }
    }

    return { state, load };
}

/** Format a Date as "HH:MM" in the user's locale (24h, leading zeros). */
export function formatTimestamp(d: Date): string {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
}
