import { ref } from 'vue';
import {
    getModule,
    getOrCreateModule,
    getCustomDataCategory,
    createCustomDataCategory,
    updateCustomDataCategory,
} from '@/shared/kv-store';
import { COPY, EXTENSION_KEY, KV_CATEGORY_SHORTY } from '@/shared/constants';
import type { Settings } from '@/shared/types';

const MODULE_NAME = COPY.appTitle;
const MODULE_DESCRIPTION =
    'Read-only Organigramm-Dashboard für den Royal-Rangers-Mitarbeiterstamm.';
const CATEGORY_NAME = 'Settings';
const CATEGORY_DESCRIPTION = 'Persistierte Konfiguration der Extension.';

/**
 * Reads and writes `settings.gateGroupId` against the ChurchTools KV-Store.
 *
 * Read path is "soft": a missing module or category resolves to
 * `settings.value === null` (config-missing) instead of throwing — so
 * non-admin users hitting the dashboard before any admin has configured
 * it see the friendly "please configure" message rather than a stack
 * trace. Write path uses getOrCreateModule and creates the category
 * on first save.
 */
export function useAdminSettings() {
    const settings = ref<Settings | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function load(): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            await getModule(EXTENSION_KEY);
            const cat = await getCustomDataCategory<Settings>(KV_CATEGORY_SHORTY);
            // The kv-store helper merges the parsed JSON into the returned
            // object alongside the category fields, so cat.gateGroupId is on
            // the same object once non-null.
            const merged = cat as unknown as (Settings & { id: number }) | undefined;
            if (merged && typeof merged.gateGroupId === 'number') {
                const next: Settings = { gateGroupId: merged.gateGroupId };
                if (
                    Array.isArray(merged.teilstammIds) &&
                    merged.teilstammIds.every((x) => typeof x === 'number')
                ) {
                    next.teilstammIds = merged.teilstammIds;
                }
                settings.value = next;
            } else {
                settings.value = null;
            }
        } catch {
            // Module not registered yet, no permission, or any other read
            // failure — UI treats it identically as config-missing.
            settings.value = null;
        } finally {
            loading.value = false;
        }
    }

    async function save(next: Settings): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const moduleObj = await getOrCreateModule(
                EXTENSION_KEY,
                MODULE_NAME,
                MODULE_DESCRIPTION,
            );
            const existing = (await getCustomDataCategory<Settings>(KV_CATEGORY_SHORTY)) as
                | (Settings & { id: number })
                | undefined;
            const data = JSON.stringify(next);

            if (existing) {
                await updateCustomDataCategory(existing.id, { data }, moduleObj.id);
            } else {
                await createCustomDataCategory(
                    {
                        customModuleId: moduleObj.id,
                        data,
                        description: CATEGORY_DESCRIPTION,
                        name: CATEGORY_NAME,
                        shorty: KV_CATEGORY_SHORTY,
                    },
                    moduleObj.id,
                );
            }
            settings.value = next;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Unbekannter Fehler beim Speichern.';
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return { settings, loading, error, load, save };
}
