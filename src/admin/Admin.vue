<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { getGroupChildren, getGroupRoles, listGroups } from './admin.api';
import type { GroupChild, PickableRole } from './admin.api';
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

const hauptstammChildren = ref<GroupChild[]>([]);
const childrenLoading = ref(false);
const childrenError = ref<string | null>(null);
const teilstammSelections = ref<Set<number>>(new Set());

const hauptstammRoles = ref<PickableRole[]>([]);
const rolesLoading = ref(false);
const rolesError = ref<string | null>(null);
const beitraegeRoleSelections = ref<Set<number>>(new Set());
// Hauptstamm changes after the initial sync should clear the Teilstamm
// picks (they refer to children of the previously-selected Hauptstamm).
let initialSyncDone = false;

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

const sortedHauptstammChildren = computed(() =>
    [...hauptstammChildren.value].sort((a, b) => a.title.localeCompare(b.title, 'de')),
);
/** Saved IDs that aren't in the freshly fetched children — show as warning. */
const orphanedTeilstammIds = computed(() => {
    const present = new Set(
        hauptstammChildren.value.map((c) => parseInt(c.domainIdentifier, 10)),
    );
    return [...teilstammSelections.value].filter((id) => !present.has(id));
});

async function loadChildrenFor(id: number) {
    childrenLoading.value = true;
    childrenError.value = null;
    try {
        hauptstammChildren.value = await getGroupChildren(id);
    } catch (e) {
        hauptstammChildren.value = [];
        childrenError.value =
            e instanceof Error ? e.message : 'Untergruppen konnten nicht geladen werden.';
    } finally {
        childrenLoading.value = false;
    }
}

const sortedRoles = computed(() =>
    [...hauptstammRoles.value]
        .filter((r) => r.isActive)
        .sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name, 'de')),
);

/** Saved role IDs the group no longer defines — surfaced rather than dropped. */
const orphanedRoleIds = computed(() => {
    const present = new Set(hauptstammRoles.value.map((r) => r.groupTypeRoleId));
    return [...beitraegeRoleSelections.value].filter((id) => !present.has(id));
});

async function loadRolesFor(id: number) {
    rolesLoading.value = true;
    rolesError.value = null;
    try {
        hauptstammRoles.value = await getGroupRoles(id);
    } catch (e) {
        hauptstammRoles.value = [];
        rolesError.value = e instanceof Error ? e.message : 'Rollen konnten nicht geladen werden.';
    } finally {
        rolesLoading.value = false;
    }
}

function toggleBeitraegeRole(id: number) {
    const next = new Set(beitraegeRoleSelections.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    beitraegeRoleSelections.value = next;
}

function toggleTeilstamm(id: number) {
    const next = new Set(teilstammSelections.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    teilstammSelections.value = next;
}

watch(selectedId, async (newId) => {
    if (!initialSyncDone) return;
    // Both picks refer to the previously selected Hauptstamm — its children
    // and its role definitions — so both are cleared when it changes.
    teilstammSelections.value = new Set();
    beitraegeRoleSelections.value = new Set();
    if (newId == null) {
        hauptstammChildren.value = [];
        hauptstammRoles.value = [];
        return;
    }
    await Promise.all([loadChildrenFor(newId), loadRolesFor(newId)]);
});

onMounted(async () => {
    groupsLoading.value = true;
    try {
        const [g] = await Promise.all([listGroups(), load()]);
        groups.value = g;
        selectedId.value = settings.value?.gateGroupId ?? null;
        teilstammSelections.value = new Set(settings.value?.teilstammIds ?? []);
        beitraegeRoleSelections.value = new Set(settings.value?.beitraegeRoleIds ?? []);
        if (selectedId.value !== null) {
            await Promise.all([loadChildrenFor(selectedId.value), loadRolesFor(selectedId.value)]);
        }
    } catch (e) {
        groupsError.value =
            e instanceof Error ? e.message : 'Gruppen konnten nicht geladen werden.';
    } finally {
        groupsLoading.value = false;
        initialSyncDone = true;
    }
});

async function handleSave() {
    if (selectedId.value == null) return;
    savedJustNow.value = false;
    try {
        await save({
            gateGroupId: selectedId.value,
            teilstammIds: [...teilstammSelections.value],
            beitraegeRoleIds: [...beitraegeRoleSelections.value],
        });
        savedJustNow.value = true;
        emit('saved');
    } catch {
        // saveError is already populated by the composable; UI shows it.
    }
}

const isLoading = computed(
    () =>
        groupsLoading.value || settingsLoading.value || childrenLoading.value || rolesLoading.value,
);

function sameIds(saved: number[] | undefined, picked: Set<number>): boolean {
    const set = new Set(saved ?? []);
    if (set.size !== picked.size) return false;
    for (const id of picked) if (!set.has(id)) return false;
    return true;
}

const hasChanges = computed(() => {
    if (selectedId.value == null) return false;
    if (selectedId.value !== settings.value?.gateGroupId) return true;
    if (!sameIds(settings.value?.teilstammIds, teilstammSelections.value)) return true;
    if (!sameIds(settings.value?.beitraegeRoleIds, beitraegeRoleSelections.value)) return true;
    return false;
});
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

            <template v-if="selectedId != null">
                <label class="rr-admin__label rr-admin__label--ts">Teilstämme</label>
                <p class="rr-admin__help">
                    Wähle die Untergruppen, die als Teilstamm-Karten erscheinen. Andere
                    Untergruppen (Maßnahmen, Events) bleiben außen vor und fließen nicht in die
                    Counts ein.
                </p>
                <div
                    v-if="childrenError"
                    class="rr-admin__error-inline"
                    role="alert"
                >
                    {{ childrenError }}
                </div>
                <div
                    class="rr-admin__list"
                    role="group"
                    aria-label="Teilstämme"
                    :aria-busy="childrenLoading || undefined"
                >
                    <p v-if="childrenLoading" class="rr-admin__list-empty">
                        {{ COPY.loading }}
                    </p>
                    <template v-else>
                        <div
                            v-for="id in orphanedTeilstammIds"
                            :key="`orphan-${id}`"
                            class="rr-admin__option rr-admin__option--missing"
                        >
                            <span class="rr-admin__option-name">
                                (nicht mehr in Untergruppen, ID {{ id }})
                            </span>
                        </div>
                        <label
                            v-for="child in sortedHauptstammChildren"
                            :key="child.domainIdentifier"
                            class="rr-admin__option rr-admin__option--check"
                            :class="{
                                'rr-admin__option--selected': teilstammSelections.has(
                                    parseInt(child.domainIdentifier, 10),
                                ),
                            }"
                        >
                            <input
                                type="checkbox"
                                class="rr-admin__checkbox"
                                :checked="
                                    teilstammSelections.has(
                                        parseInt(child.domainIdentifier, 10),
                                    )
                                "
                                @change="
                                    toggleTeilstamm(parseInt(child.domainIdentifier, 10))
                                "
                            />
                            <span class="rr-admin__option-name">{{ child.title }}</span>
                            <span class="rr-admin__option-id">
                                ID {{ child.domainIdentifier }}
                            </span>
                        </label>
                        <p
                            v-if="!sortedHauptstammChildren.length && !orphanedTeilstammIds.length"
                            class="rr-admin__list-empty"
                        >
                            Keine Untergruppen.
                        </p>
                    </template>
                </div>

                <label class="rr-admin__label rr-admin__label--ts">
                    Zugriff auf die Beitragsabrechnung
                </label>
                <p class="rr-admin__help">
                    Wähle die Rollen, die den Tab „Beitragsabrechnung" öffnen dürfen. Dessen
                    Excel-Export enthält Namen, Geburtsdaten und Adressen aller Teilnehmer — wähle
                    hier so eng wie möglich. Ohne Auswahl bleibt der Tab für alle verborgen.
                </p>
                <div v-if="rolesError" class="rr-admin__error-inline" role="alert">
                    {{ rolesError }}
                </div>
                <div
                    class="rr-admin__list"
                    role="group"
                    aria-label="Rollen für die Beitragsabrechnung"
                    :aria-busy="rolesLoading || undefined"
                >
                    <p v-if="rolesLoading" class="rr-admin__list-empty">{{ COPY.loading }}</p>
                    <template v-else>
                        <div
                            v-for="id in orphanedRoleIds"
                            :key="`orphan-role-${id}`"
                            class="rr-admin__option rr-admin__option--missing"
                        >
                            <span class="rr-admin__option-name">
                                (Rolle nicht mehr vorhanden, ID {{ id }})
                            </span>
                        </div>
                        <label
                            v-for="role in sortedRoles"
                            :key="role.groupTypeRoleId"
                            class="rr-admin__option rr-admin__option--check"
                            :class="{
                                'rr-admin__option--selected': beitraegeRoleSelections.has(
                                    role.groupTypeRoleId,
                                ),
                            }"
                        >
                            <input
                                type="checkbox"
                                class="rr-admin__checkbox"
                                :checked="beitraegeRoleSelections.has(role.groupTypeRoleId)"
                                @change="toggleBeitraegeRole(role.groupTypeRoleId)"
                            />
                            <span class="rr-admin__option-name">{{ role.name }}</span>
                            <span class="rr-admin__option-id">ID {{ role.groupTypeRoleId }}</span>
                        </label>
                        <p
                            v-if="!sortedRoles.length && !orphanedRoleIds.length"
                            class="rr-admin__list-empty"
                        >
                            Keine Rollen.
                        </p>
                    </template>
                </div>
            </template>

            <div class="rr-admin__actions">
                <button
                    type="submit"
                    class="rr-admin__button"
                    :disabled="isLoading || !hasChanges"
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

.rr-admin__label--ts {
    margin-top: 0.5rem;
}

.rr-admin__help {
    margin: -0.25rem 0 0;
    color: var(--rr-text-secondary);
    font-size: 0.8125rem;
    line-height: 1.4;
}

.rr-admin__option--check {
    cursor: pointer;
    justify-content: flex-start;
}
.rr-admin__option--check .rr-admin__option-name {
    flex: 1;
}

.rr-admin__checkbox {
    flex-shrink: 0;
    margin: 0;
    width: 1rem;
    height: 1rem;
    accent-color: var(--rr-accent-fg);
    cursor: pointer;
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
