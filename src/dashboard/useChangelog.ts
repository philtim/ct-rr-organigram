import { ref } from 'vue';
import { readStoredChangeLog } from '@/shared/changelog';
import type { ChangeLog } from '@/shared/changelog';

export type ChangelogState =
    | { phase: 'loading' }
    | { phase: 'never' }
    | { phase: 'unreadable' }
    | { phase: 'ready'; log: ChangeLog };

/**
 * The dashboard's side of the Änderungsprotokoll: one read of what the admin
 * stored. A failed read is "unreadable", never "no changes" — the one claim
 * this panel must not make about data it could not see.
 */
export function useChangelog() {
    const state = ref<ChangelogState>({ phase: 'loading' });

    async function load(): Promise<void> {
        try {
            state.value = await readStoredChangeLog();
        } catch {
            state.value = { phase: 'unreadable' };
        }
    }

    return { state, load };
}
