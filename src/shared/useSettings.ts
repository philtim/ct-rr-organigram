import { ref } from 'vue';
import { findModule, getCustomDataCategory } from './kv-store';
import { EXTENSION_KEY, KV_CATEGORY_SHORTY } from './constants';
import { EMPTY_SETTINGS, parseSettings } from './settings';
import type { Settings } from './settings';

/**
 * Reads the configuration from the ChurchTools KV-Store. Every view reads it;
 * only the admin form writes it (`admin/useAdminSettings`).
 *
 * A missing module or category resolves to `EMPTY_SETTINGS` instead of
 * throwing, so somebody opening the extension before any admin has
 * configured it sees the configuration hint rather than a stack trace.
 */
export function useSettings() {
    const settings = ref<Settings>(EMPTY_SETTINGS);
    /**
     * True when the configuration could not be read at all — as opposed to
     * being absent. The two must not be confused: treating a failed request
     * as "nothing configured yet" would show the setup form to whoever is
     * looking, and a save would overwrite a configuration that is merely
     * unreachable.
     */
    const loadFailed = ref(false);

    async function load(): Promise<void> {
        loadFailed.value = false;
        try {
            const module = await findModule(EXTENSION_KEY);
            if (!module) {
                // Not installed yet. A genuine first run: nothing is
                // configured and there is nothing to fail at.
                settings.value = EMPTY_SETTINGS;
                return;
            }
            const cat = await getCustomDataCategory<Settings>(KV_CATEGORY_SHORTY, module.id);
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
        }
    }

    return { settings, loadFailed, load };
}
