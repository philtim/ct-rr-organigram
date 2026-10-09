import { ref } from 'vue';
import {
    findModule,
    getOrCreateModule,
    getCustomDataCategory,
    createCustomDataCategory,
    updateCustomDataCategory,
} from '@/shared/kv-store';
import { COPY, EXTENSION_KEY, KV_CATEGORY_SHORTY } from '@/shared/constants';
import { EMPTY_SETTINGS, parseSettings } from '@/shared/settings';
import type { Settings } from '@/shared/settings';

const MODULE_NAME = COPY.appTitle;
const MODULE_DESCRIPTION =
    'Read-only Organigramm-Dashboard für den Royal-Rangers-Mitarbeiterstamm.';
const CATEGORY_NAME = 'Settings';
const CATEGORY_DESCRIPTION = 'Persistierte Konfiguration der Extension.';

/**
 * Reads and writes the configuration against the ChurchTools KV-Store.
 *
 * Read path is "soft": a missing module or category resolves to
 * `EMPTY_SETTINGS` instead of throwing, so somebody opening the dashboard
 * before any admin has configured it sees the configuration hint rather than
 * a stack trace. Write path uses getOrCreateModule and creates the category
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

export function useAdminSettings() {
    const settings = ref<Settings>(EMPTY_SETTINGS);
    const loading = ref(false);
    const error = ref<string | null>(null);
    /**
     * True when the configuration could not be read at all — as opposed to
     * being absent. The two must not be confused: treating a failed request
     * as "nothing configured yet" would show the setup form to whoever is
     * looking, and a save would overwrite a configuration that is merely
     * unreachable.
     */
    const loadFailed = ref(false);

    async function load(): Promise<void> {
        loading.value = true;
        error.value = null;
        loadFailed.value = false;
        try {
            const module = await findModule(EXTENSION_KEY);
            if (!module) {
                // Not installed yet. A genuine first run: nothing is
                // configured and there is nothing to fail at.
                settings.value = EMPTY_SETTINGS;
                return;
            }
            const cat = await getCustomDataCategory<Settings>(KV_CATEGORY_SHORTY);
            // The kv-store helper merges the parsed JSON into the returned
            // object alongside the category fields, so the settings live on
            // the same object. `parseSettings` reads what is there and
            // invents nothing for what is not (shared/settings.ts).
            settings.value = cat ? parseSettings(cat) : EMPTY_SETTINGS;
        } catch {
            // No permission, a 5xx, a timeout. We do not know what is
            // configured, so we must not act as though nothing is.
            settings.value = EMPTY_SETTINGS;
            loadFailed.value = true;
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

    return { settings, loading, error, loadFailed, load, save };
}
