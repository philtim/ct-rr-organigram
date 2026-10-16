import { ref } from 'vue';
import { syncChangeLog } from './changelog.api';
import { statusOf } from '@/shared/api';
import { CHANGELOG_SHORTY, readStoredChangeLog } from '@/shared/changelog';
import type { ChangeLog } from '@/shared/changelog';
import { EXTENSION_KEY } from '@/shared/constants';
import { COPY } from '@/shared/copy';
import { findCategory, findModule, writeCategory } from '@/shared/kv-store';
import type { Settings } from '@/shared/settings';

const CATEGORY_NAME = 'Änderungsprotokoll';
const CATEGORY_DESCRIPTION =
    'Mitgliedschafts-Änderungen der letzten 30 Tage, vom Admin aus dem Log abgerufen.';

export type SyncState =
    | { phase: 'loading' }
    | { phase: 'never' }
    | { phase: 'unreadable' }
    | { phase: 'stored'; log: ChangeLog }
    | { phase: 'running'; log: ChangeLog | null }
    | { phase: 'error'; message: string; log: ChangeLog | null };

/**
 * The admin's button: fetch the log, write the category. A failure anywhere
 * leaves the stored log as it was — the dashboard never sees a half-fetched
 * window — and the previous log stays on screen next to the error.
 */
export function useChangelogSync() {
    const state = ref<SyncState>({ phase: 'loading' });

    async function load(): Promise<void> {
        try {
            const stored = await readStoredChangeLog();
            state.value = stored.phase === 'ready' ? { phase: 'stored', log: stored.log } : stored;
        } catch {
            state.value = { phase: 'unreadable' };
        }
    }

    async function run(settings: Settings): Promise<void> {
        const previous = 'log' in state.value ? state.value.log : null;
        state.value = { phase: 'running', log: previous };
        try {
            const log = await syncChangeLog(settings, new Date());
            const module = await findModule(EXTENSION_KEY);
            if (!module) throw new Error(COPY.adminChangelogNoModule);
            const existing = await findCategory(module.id, CHANGELOG_SHORTY);
            await writeCategory(
                module.id,
                {
                    customModuleId: module.id,
                    data: JSON.stringify(log),
                    description: existing?.description ?? CATEGORY_DESCRIPTION,
                    name: existing?.name ?? CATEGORY_NAME,
                    shorty: CHANGELOG_SHORTY,
                },
                existing?.id,
            );
            state.value = { phase: 'stored', log };
        } catch (e) {
            const message =
                statusOf(e) === 403
                    ? COPY.adminChangelogForbidden
                    : e instanceof Error
                      ? e.message
                      : COPY.adminChangelogError;
            state.value = { phase: 'error', message, log: previous };
        }
    }

    return { state, load, run };
}
