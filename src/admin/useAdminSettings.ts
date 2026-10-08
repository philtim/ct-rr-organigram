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
/**
 * The metadata `getCustomDataCategory` returns alongside the parsed settings.
 * All optional: the read path tolerates a category that predates these
 * fields, and the write path falls back to the constants above.
 */
type ExistingCategory = {
    id: number;
    customModuleId?: number;
    description?: string;
    name?: string;
    shorty?: string;
};

function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((x) => typeof x === 'number');
}

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
                if (isNumberArray(merged.teilstammIds)) {
                    next.teilstammIds = merged.teilstammIds;
                }
                // An unparsable or missing value leaves the field undefined,
                // which makes the Beitragsabrechnung unavailable rather than
                // open to everyone (ADR-008, fail closed).
                if (isNumberArray(merged.beitraegeRoleIds)) {
                    next.beitraegeRoleIds = merged.beitraegeRoleIds;
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
                | (Settings & ExistingCategory)
                | undefined;
            const data = JSON.stringify(next);

            if (existing) {
                // A PUT replaces the record, so the metadata has to travel
                // with the payload — sending `{ data }` alone fails with
                // HTTP 400. The existing values are reused rather than
                // overwritten with our constants, so a category someone
                // renamed in ChurchTools keeps its name.
                await updateCustomDataCategory(
                    existing.id,
                    {
                        customModuleId: existing.customModuleId ?? moduleObj.id,
                        data,
                        description: existing.description ?? CATEGORY_DESCRIPTION,
                        name: existing.name ?? CATEGORY_NAME,
                        shorty: existing.shorty ?? KV_CATEGORY_SHORTY,
                    },
                    moduleObj.id,
                );
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
