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
const searchText = ref('');

const sortedGroups = computed(() =>
    [...groups.value].sort((a, b) => a.name.localeCompare(b.name, 'de')),
);
const selectedGroupExists = computed(() =>
    selectedId.value == null ? false : groups.value.some((g) => g.id === selectedId.value),
);
const filteredGroups = computed(() => {
    const q = searchText.value.trim().toLocaleLowerCase('de');
    if (!q) return sortedGroups.value;
    return sortedGroups.value.filter(
        (g) => g.name.toLocaleLowerCase('de').includes(q) || String(g.id).includes(q),
    );
});

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
            <label class="rr-admin__label" for="gate-group-search">Hauptstamm-Gruppe</label>
            <input
                id="gate-group-search"
                v-model="searchText"
                type="search"
                class="rr-admin__search"
                placeholder="Gruppe suchen (Name oder ID)…"
                :disabled="isLoading"
                autocomplete="off"
            />

            <div
                class="rr-admin__list"
                role="listbox"
                aria-label="Hauptstamm-Gruppen"
                :aria-busy="isLoading || undefined"
            >
                <p v-if="isLoading" class="rr-admin__list-empty">{{ COPY.loading }}</p>
                <template v-else>
                    <button
                        v-if="settings && !selectedGroupExists && selectedId != null"
                        type="button"
                        role="option"
                        class="rr-admin__option rr-admin__option--missing"
                        :aria-selected="true"
                    >
                        <span class="rr-admin__option-name">
                            (nicht mehr vorhanden, ID {{ selectedId }})
                        </span>
                    </button>
                    <button
                        v-for="g in filteredGroups"
                        :key="g.id"
                        type="button"
                        role="option"
                        class="rr-admin__option"
                        :class="{ 'rr-admin__option--selected': g.id === selectedId }"
                        :aria-selected="g.id === selectedId"
                        @click="selectedId = g.id"
                    >
                        <span class="rr-admin__option-name">{{ g.name }}</span>
                        <span class="rr-admin__option-id">ID {{ g.id }}</span>
                    </button>
                    <p v-if="!filteredGroups.length" class="rr-admin__list-empty">
                        Keine Gruppe passt zu „{{ searchText }}".
                    </p>
                </template>
            </div>

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

.rr-admin__search {
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    border: 0.5px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-bg-primary);
    color: inherit;
}
.rr-admin__search:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 1px;
}

.rr-admin__list {
    display: flex;
    flex-direction: column;
    max-height: 320px;
    overflow-y: auto;
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-bg-primary);
}

.rr-admin__list-empty {
    margin: 0;
    padding: 0.75rem 0.875rem;
    color: var(--rr-text-secondary);
    font-size: 0.875rem;
    font-style: italic;
}

.rr-admin__option {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 0.875rem;
    border: 0;
    border-bottom: 0.5px solid var(--rr-border-tertiary);
    background: transparent;
    color: inherit;
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: background-color var(--rr-dur-hover) var(--rr-ease-out);
}
.rr-admin__option:last-child {
    border-bottom: 0;
}
.rr-admin__option:hover {
    background: var(--rr-bg-hover-on-white);
}
.rr-admin__option:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: -2px;
}
.rr-admin__option--selected {
    background: var(--rr-accent-bg);
    color: var(--rr-accent-fg);
}
.rr-admin__option--selected:hover {
    background: var(--rr-accent-bg);
}
.rr-admin__option--missing {
    background: var(--rr-error-bg);
    color: var(--rr-error-fg);
    cursor: default;
}
.rr-admin__option-name {
    font-size: 0.95rem;
}
.rr-admin__option-id {
    font-size: 0.8125rem;
    color: var(--rr-text-secondary);
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    flex-shrink: 0;
}
.rr-admin__option--selected .rr-admin__option-id {
    color: var(--rr-accent-fg);
    opacity: 0.8;
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
