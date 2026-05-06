<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { listGroups } from './admin.api';
import { useAdminSettings } from './useAdminSettings';
import type { Group } from '@/shared/types';
import { COPY } from '@/shared/constants';

const props = defineProps<{ firstRun?: boolean }>();
const emit = defineEmits<{ saved: [] }>();

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
        emit('saved');
    } catch {
        // saveError is already populated by the composable; UI shows it.
    }
}

const isLoading = computed(() => groupsLoading.value || settingsLoading.value);
</script>

<template>
    <section class="rr-admin">
        <header class="rr-admin__header">
            <p class="rr-admin__subtitle">
                {{ props.firstRun ? 'ERSTMALIGES SETUP' : 'EXTENSION SETTINGS' }}
            </p>
            <h1 class="rr-admin__title">{{ COPY.appTitle }}</h1>
            <p class="rr-admin__lead">
                <template v-if="props.firstRun">
                    Wähle die Hauptstamm-Gruppe, um das Dashboard zu aktivieren. Die Extension
                    nutzt sie für den Zugriffscheck und liest Teilstämme und Teams aus deren
                    Children-Hierarchie.
                </template>
                <template v-else>
                    Wähle die Hauptstamm-Gruppe. Die Extension nutzt sie für den Zugriffscheck und
                    liest Teilstämme und Teams aus deren Children-Hierarchie.
                </template>
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
    color: var(--rr-text-primary);
}

.rr-admin__header {
    margin-bottom: 1.5rem;
}

.rr-admin__subtitle {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    color: var(--rr-text-secondary);
}

.rr-admin__title {
    margin: 0.25rem 0 0.75rem;
    font-size: 1.5rem;
    font-weight: 600;
}

.rr-admin__lead {
    margin: 0;
    color: var(--rr-text-secondary);
    line-height: 1.5;
}

.rr-admin__form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 1.25rem;
    background: var(--rr-bg-primary);
}

.rr-admin__label {
    font-size: 0.875rem;
    font-weight: 500;
}

.rr-admin__select {
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    border: 0.5px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-bg-primary);
    color: inherit;
}

.rr-admin__actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
}

.rr-admin__button {
    padding: 0.5rem 1rem;
    font-size: 0.95rem;
    font-weight: 500;
    border: 0.5px solid var(--rr-text-primary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-text-primary);
    color: var(--rr-bg-primary);
    cursor: pointer;
}

.rr-admin__button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.rr-admin__success {
    color: var(--rr-success-fg);
    font-size: 0.875rem;
}

.rr-admin__error,
.rr-admin__error-inline {
    color: var(--rr-error-fg);
    font-size: 0.875rem;
}

.rr-admin__error {
    padding: 0.75rem 1rem;
    border: 0.5px solid var(--rr-error-border);
    background: var(--rr-error-bg);
    border-radius: var(--rr-radius-md);
    margin-bottom: 1rem;
}

@media (max-width: 767px) {
    .rr-admin {
        margin: 1rem auto;
        padding: 1rem;
    }
}
</style>
