import { ref } from 'vue';
import {
    getOrCreateModule,
    getCustomDataCategory,
    createCustomDataCategory,
    updateCustomDataCategory,
} from '@/shared/kv-store';
import { COPY, EXTENSION_KEY, KV_CATEGORY_SHORTY } from '@/shared/constants';
import type { Settings } from '@/shared/settings';
import { useSettings } from '@/shared/useSettings';

const MODULE_NAME = COPY.appTitle;
const MODULE_DESCRIPTION =
    'Read-only Organigramm-Dashboard für den Royal-Rangers-Mitarbeiterstamm.';
const CATEGORY_NAME = 'Settings';
const CATEGORY_DESCRIPTION = 'Persistierte Konfiguration der Extension.';

/**
 * The configuration, read as every view reads it, plus the write the admin
 * form needs. The write creates the module and the category on first save.
 */
export function useAdminSettings() {
    const { settings, loadFailed, load } = useSettings();
    const saving = ref(false);
    const saveError = ref<string | null>(null);

    async function save(next: Settings): Promise<void> {
        saving.value = true;
        saveError.value = null;
        try {
            const moduleObj = await getOrCreateModule(
                EXTENSION_KEY,
                MODULE_NAME,
                MODULE_DESCRIPTION,
            );
            const existing = await getCustomDataCategory<Settings>(
                KV_CATEGORY_SHORTY,
                moduleObj.id,
            );
            const data = JSON.stringify(next);

            if (existing) {
                // A PUT replaces the record, so the metadata has to travel
                // with the payload — sending `{ data }` alone fails with
                // HTTP 400. The existing values are reused rather than
                // overwritten with our constants, so a category someone
                // renamed in ChurchTools keeps its name. The fallbacks cover
                // a category that predates these fields.
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
            saveError.value = e instanceof Error ? e.message : 'Unbekannter Fehler beim Speichern.';
            throw e;
        } finally {
            saving.value = false;
        }
    }

    return { settings, loadFailed, load, saving, saveError, save };
}
