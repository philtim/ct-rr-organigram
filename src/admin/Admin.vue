<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { listGroups } from './admin.api';
import { useAdminSettings } from './useAdminSettings';
import type { Group } from '@/shared/types';
import { COPY } from '@/shared/constants';

const groups = ref<Group[]>([]);
const groupsLoading = ref(false);
const groupsError = ref<string | null>(null);

const { settings, loading: settingsLoading, error: saveError, load, save } = useAdminSettings();

const selectedId = ref<number | null>(null);
const savedJustNow = ref(false);

const sortedGroups = computed(() =>
    [...groups.value].sort((a, b) => a.name.localeCompare(b.name, 'de')),
);
const selectedGroupExists = computed(() =>
    selectedId.value == null ? false : groups.value.some((g) => g.id === selectedId.value),
);

onMounted(async () => {
    groupsLoading.value = true;
    try {
        const [g] = await Promise.all([listGroups(), load()]);
        groups.value = g;
        selectedId.value = settings.value?.gateGroupId ?? null;
    } catch (e) {
        groupsError.value =
            e instanceof Error ? e.message : 'Gruppen konnten nicht geladen werden.';
    } finally {
        groupsLoading.value = false;
    }
});

async function handleSave() {
    if (selectedId.value == null) return;
    savedJustNow.value = false;
    try {
        await save({ gateGroupId: selectedId.value });
        savedJustNow.value = true;
    } catch {
        // saveError is already populated by the composable; UI shows it.
    }
}

const isLoading = computed(() => groupsLoading.value || settingsLoading.value);
</script>

<template>
    <section class="rr-admin">
        <header class="rr-admin__header">
            <p class="rr-admin__subtitle">EXTENSION SETTINGS</p>
            <h1 class="rr-admin__title">{{ COPY.appTitle }}</h1>
            <p class="rr-admin__lead">
                Wähle die Hauptstamm-Gruppe. Die Extension nutzt sie für den Zugriffscheck und liest
                Teilstämme und Teams aus deren Children-Hierarchie.
            </p>
        </header>

        <div v-if="groupsError" class="rr-admin__error" role="alert">
            {{ groupsError }}
        </div>

        <form class="rr-admin__form" @submit.prevent="handleSave">
            <label class="rr-admin__label" for="gate-group">Hauptstamm-Gruppe</label>
            <select
                id="gate-group"
                v-model="selectedId"
                class="rr-admin__select"
                :disabled="isLoading"
            >
                <option :value="null" disabled>— Bitte auswählen —</option>
                <option v-for="g in sortedGroups" :key="g.id" :value="g.id">
                    {{ g.name }} (ID {{ g.id }})
                </option>
                <option
                    v-if="settings && !selectedGroupExists && selectedId != null"
                    :value="selectedId"
                >
                    (nicht mehr vorhanden, ID: {{ selectedId }})
                </option>
            </select>

            <div class="rr-admin__actions">
                <button
                    type="submit"
                    class="rr-admin__button"
                    :disabled="
                        isLoading || selectedId == null || selectedId === settings?.gateGroupId
                    "
                >
                    Speichern
                </button>
                <span v-if="savedJustNow" class="rr-admin__success" role="status">
                    Gespeichert.
                </span>
                <span v-if="saveError" class="rr-admin__error-inline" role="alert">
                    {{ saveError }}
                </span>
            </div>
        </form>
    </section>
</template>

<style scoped>
.rr-admin {
    max-width: 720px;
    margin: 2rem auto;
    padding: 1.5rem;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1f2937;
}

.rr-admin__header {
    margin-bottom: 1.5rem;
}

.rr-admin__subtitle {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    color: #6b7280;
}

.rr-admin__title {
    margin: 0.25rem 0 0.75rem;
    font-size: 1.5rem;
    font-weight: 600;
}

.rr-admin__lead {
    margin: 0;
    color: #4b5563;
    line-height: 1.5;
}

.rr-admin__form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 0.5px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem;
    background: #fff;
}

.rr-admin__label {
    font-size: 0.875rem;
    font-weight: 500;
}

.rr-admin__select {
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    border: 0.5px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: inherit;
}

.rr-admin__actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.rr-admin__button {
    padding: 0.5rem 1rem;
    font-size: 0.95rem;
    font-weight: 500;
    border: 0.5px solid #1f2937;
    border-radius: 8px;
    background: #1f2937;
    color: #fff;
    cursor: pointer;
}

.rr-admin__button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.rr-admin__success {
    color: #047857;
    font-size: 0.875rem;
}

.rr-admin__error,
.rr-admin__error-inline {
    color: #b91c1c;
    font-size: 0.875rem;
}

.rr-admin__error {
    padding: 0.75rem 1rem;
    border: 0.5px solid #fecaca;
    background: #fef2f2;
    border-radius: 8px;
    margin-bottom: 1rem;
}
</style>
