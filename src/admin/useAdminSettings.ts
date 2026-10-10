import { ref } from 'vue';
import { getOrCreateModule, readCategory, writeCategory } from '@/shared/kv-store';
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
            const module = await getOrCreateModule(EXTENSION_KEY, MODULE_NAME, MODULE_DESCRIPTION);
            const existing = (await readCategory(module.id, KV_CATEGORY_SHORTY))?.category;
            // The existing metadata is reused rather than overwritten with our
            // constants, so a category someone renamed in ChurchTools keeps
            // its name. The fallbacks cover a category that predates a field.
            await writeCategory(
                module.id,
                {
                    customModuleId: module.id,
                    data: JSON.stringify(next),
                    description: existing?.description ?? CATEGORY_DESCRIPTION,
                    name: existing?.name ?? CATEGORY_NAME,
                    shorty: KV_CATEGORY_SHORTY,
                },
                existing?.id,
            );
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
