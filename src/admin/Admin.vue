<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
    getGroupChildren,
    listGroupTypes,
    listGroups,
    listRoles,
    personsInScope,
    personsWithRole,
    scanScope,
} from './admin.api';
import type { ChildGroup, GroupTypeRef, PickableRole, ScopeScan } from './admin.api';
import { useAdminSettings } from './useAdminSettings';
import { EMPTY_SETTINGS, isDashboardConfigured } from '@/shared/settings';
import type { Settings } from '@/shared/settings';
import type { Group } from '@/shared/types';
import { COPY } from '@/shared/constants';

/**
 * The one screen where this extension learns what Stamm it is running at.
 *
 * Nothing here has a default taken from the authors' own installation
 * (CLAUDE.md). Where a value would be hard to guess, the screen shows what is
 * actually in *this* instance instead — which group types occur under the
 * chosen Teilstämme, how many people hold each role, which member fields
 * exist. The preview line turns a misconfiguration into a visible zero before
 * it becomes an empty dashboard.
 */
const props = defineProps<{ firstRun?: boolean }>();
const emit = defineEmits<{ saved: [] }>();

const { settings, loading: saving, error: saveError, load, save } = useAdminSettings();

/** The edited copy. Saved only on demand, so a half-made change cannot leak. */
const draft = ref<Settings>({ ...EMPTY_SETTINGS, fees: { ...EMPTY_SETTINGS.fees } });

const groups = ref<Group[]>([]);
const groupTypes = ref<GroupTypeRef[]>([]);
const roles = ref<PickableRole[]>([]);
const loadError = ref<string | null>(null);
const booting = ref(true);
const savedJustNow = ref(false);

const searchText = ref('');
const onlyChildren = ref(true);
const hauptstammChildren = ref<ChildGroup[]>([]);
const scan = ref<ScopeScan | null>(null);
const scanning = ref(false);

const groupById = computed(() => new Map(groups.value.map((g) => [g.id, g])));
const typeNameById = computed(() => new Map(groupTypes.value.map((t) => [t.id, t.name])));

function groupTypeOf(group: Group | undefined): number | null {
    const id = (group as unknown as { information?: { groupTypeId?: number } } | undefined)
        ?.information?.groupTypeId;
    return typeof id === 'number' ? id : null;
}

const hauptstamm = computed(() =>
    draft.value.gateGroupId === null ? undefined : groupById.value.get(draft.value.gateGroupId),
);

/** Which types the Teilstamm picker offers. Defaults to the Hauptstamm's own. */
const stammTypeIds = computed(() => {
    if (draft.value.stammGroupTypeIds.length) return draft.value.stammGroupTypeIds;
    const own = groupTypeOf(hauptstamm.value);
    return own === null ? [] : [own];
});

const filteredGroups = computed(() => {
    const q = searchText.value.trim().toLocaleLowerCase('de');
    const sorted = [...groups.value].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (!q) return sorted.slice(0, 50);
    return sorted
        .filter((g) => g.name.toLocaleLowerCase('de').includes(q) || String(g.id).includes(q))
        .slice(0, 50);
});

/** Children of the Hauptstamm whose type matches — the normal Teilstamm case. */
const childCandidates = computed(() => {
    const types = new Set(stammTypeIds.value);
    return hauptstammChildren.value
        .filter((c) => types.size === 0 || types.has(c.groupTypeId))
        .sort((a, b) => a.title.localeCompare(b.title, 'de'));
});

/** Every group of the configured types — for a Stamm whose structure is flat. */
const otherCandidates = computed(() => {
    const types = new Set(stammTypeIds.value);
    const childIds = new Set(hauptstammChildren.value.map((c) => c.id));
    return groups.value
        .filter((g) => !childIds.has(g.id) && types.has(groupTypeOf(g) ?? -1))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
});

/** Group types found under the chosen Teilstämme, with how many there are. */
const childTypeCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const child of scan.value?.children ?? []) {
        counts.set(child.groupTypeId, (counts.get(child.groupTypeId) ?? 0) + 1);
    }
    return [...counts.entries()]
        .map(([id, count]) => ({ id, count, name: typeNameById.value.get(id) ?? `Typ ${id}` }))
        .sort((a, b) => b.count - a.count);
});

const teamCount = computed(() => {
    const types = new Set(draft.value.teamGroupTypeIds);
    return (scan.value?.children ?? []).filter((c) => types.has(c.groupTypeId)).length;
});

const personCount = computed(() =>
    scan.value === null
        ? 0
        : personsInScope(
              scan.value,
              draft.value.gateGroupId,
              draft.value.teilstammIds,
              draft.value.teamGroupTypeIds,
          ),
);

/**
 * Only the roles that can actually occur in the configured scope.
 *
 * `GET /group/roles` returns one definition *per group type*, so an
 * installation with four types offers four roles called "Leiter" — identical
 * in the list and impossible to tell apart. Narrowing to the types in play
 * removes most of the duplication; what remains gets the type name appended,
 * because two roles with the same name in two types are genuinely different
 * roles and the admin has to be able to pick the right one.
 */
const relevantRoles = computed(() => {
    const types = new Set([...stammTypeIds.value, ...draft.value.teamGroupTypeIds]);
    const inScope = roles.value.filter((r) => r.groupTypeId !== null && types.has(r.groupTypeId));

    const nameCounts = new Map<string, number>();
    for (const role of inScope) nameCounts.set(role.name, (nameCounts.get(role.name) ?? 0) + 1);

    return inScope
        .map((role) => ({
            ...role,
            label:
                (nameCounts.get(role.name) ?? 0) > 1
                    ? `${role.name} (${typeNameById.value.get(role.groupTypeId ?? -1) ?? '?'})`
                    : role.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'de'));
});

/** Roles ChurchTools itself calls leadership — always count, never togglable. */
const leadershipRoles = computed(() => relevantRoles.value.filter((r) => r.isLeadership));

/** Participant roles the Stamm may additionally treat as Mitarbeiter. */
const participantRoles = computed(() => relevantRoles.value.filter((r) => !r.isLeadership));

/** Only roles that can actually appear as a vacancy are worth offering. */
const vacancyRoles = computed(() => leadershipRoles.value);

function roleHolders(roleId: number): number {
    return scan.value === null ? 0 : personsWithRole(scan.value, roleId);
}

const canSave = computed(() => isDashboardConfigured(draft.value) && !saving.value);

function toggle(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function selectHauptstamm(id: number) {
    if (draft.value.gateGroupId === id) return;
    draft.value.gateGroupId = id;
    // The previous picks referred to another Hauptstamm's structure.
    draft.value.teilstammIds = [];
    draft.value.teamGroupTypeIds = [];
    searchText.value = '';
}

async function refreshChildren(id: number | null) {
    hauptstammChildren.value = [];
    if (id === null) return;
    try {
        const rows = await getGroupChildren(id);
        hauptstammChildren.value = rows.map((row) => ({
            id: Number(row.domainIdentifier),
            title: row.title,
            groupTypeId: row.domainAttributes.groupTypeId,
            teilstammId: id,
        }));
    } catch (e) {
        console.error('[rr-dashboard] children unavailable:', e);
    }
}

async function runScan() {
    if (draft.value.gateGroupId === null || draft.value.teilstammIds.length === 0) {
        scan.value = null;
        return;
    }
    scanning.value = true;
    try {
        scan.value = await scanScope(draft.value.gateGroupId, draft.value.teilstammIds);
    } finally {
        scanning.value = false;
    }
}

watch(() => draft.value.gateGroupId, refreshChildren);
watch(() => draft.value.teilstammIds.join(','), runScan);

/**
 * Euro in the input, cents in the model — the arithmetic stays exact.
 *
 * The inputs commit on `change`, not on `input`. Re-formatting on every
 * keystroke rewrites the field under the typist: entering "80" produced
 * "8.00", because the first digit was reformatted and the cursor moved before
 * the second arrived.
 */
function toEuro(cents: number): string {
    return (cents / 100).toFixed(2);
}

function fromEuro(value: string): number {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}

function setRung(index: number, value: string) {
    const next = [...draft.value.fees.childCents];
    next[index] = fromEuro(value);
    draft.value.fees = { ...draft.value.fees, childCents: next };
}

function addRung() {
    const ladder = draft.value.fees.childCents;
    draft.value.fees = {
        ...draft.value.fees,
        childCents: [...ladder, ladder.length ? ladder[ladder.length - 1] : 0],
    };
}

function removeRung() {
    draft.value.fees = {
        ...draft.value.fees,
        childCents: draft.value.fees.childCents.slice(0, -1),
    };
}

/** The label a rung carries — the last one applies to every further child. */
function rungLabel(index: number, total: number): string {
    return index === total - 1 && total > 1 ? `ab ${index + 1}. Kind` : `${index + 1}. Kind`;
}

async function onSave() {
    savedJustNow.value = false;
    // Persist the type filter that was only derived until now, so the next
    // admin sees what is in force rather than a value that moves with the
    // Hauptstamm's own type.
    const payload: Settings = {
        ...draft.value,
        stammGroupTypeIds: stammTypeIds.value,
    };
    try {
        await save(payload);
        savedJustNow.value = true;
        emit('saved');
    } catch {
        // `saveError` carries the message.
    }
}

onMounted(async () => {
    try {
        const [g, t, r] = await Promise.all([listGroups(), listGroupTypes(), listRoles()]);
        groups.value = g;
        groupTypes.value = t;
        roles.value = r;
        await load();
        draft.value = { ...settings.value, fees: { ...settings.value.fees } };
        await refreshChildren(draft.value.gateGroupId);
        await runScan();
    } catch (e) {
        loadError.value =
            e instanceof Error ? e.message : 'Konfiguration konnte nicht geladen werden.';
    } finally {
        booting.value = false;
    }
});
</script>

<template>
    <main class="rr-admin">
        <header class="rr-admin__header">
            <p class="rr-admin__subtitle">
                {{ props.firstRun ? 'Erstmaliges Setup' : 'Konfiguration' }}
            </p>
            <h1 class="rr-admin__title">{{ COPY.appTitle }}</h1>
            <p class="rr-admin__lead">
                Diese Extension kennt keinen Stamm. Alles, was sie über euren wissen muss, steht
                hier — damit derselbe Build bei jedem Royal-Rangers-Stamm läuft.
            </p>
        </header>

        <p v-if="booting" class="rr-admin__help">{{ COPY.loading }}</p>
        <p v-else-if="loadError" class="rr-admin__error" role="alert">{{ loadError }}</p>

        <form v-else class="rr-admin__form" @submit.prevent="onSave">
            <h2 class="rr-admin__section">Struktur</h2>

            <label class="rr-admin__label" for="rr-admin-search">Hauptstamm-Gruppe</label>
            <p class="rr-admin__help">
                Zugangstor, Hero-Karte im Organigramm, und eine der beiden Quellen für „Mitarbeiter
                ohne Team".
            </p>
            <p v-if="hauptstamm" class="rr-admin__chosen">
                {{ hauptstamm.name }}
                <span class="rr-admin__option-id">ID {{ hauptstamm.id }}</span>
            </p>
            <input
                id="rr-admin-search"
                v-model="searchText"
                class="rr-admin__search"
                type="search"
                placeholder="Gruppe suchen (Name oder ID)…"
            />
            <ul v-if="searchText.trim()" class="rr-admin__list">
                <li
                    v-for="group in filteredGroups"
                    :key="group.id"
                    class="rr-admin__option"
                    :class="{ 'rr-admin__option--selected': group.id === draft.gateGroupId }"
                    @click="selectHauptstamm(group.id)"
                >
                    <span class="rr-admin__option-name">{{ group.name }}</span>
                    <span class="rr-admin__option-id">ID {{ group.id }}</span>
                </li>
                <li v-if="!filteredGroups.length" class="rr-admin__list-empty">
                    Keine Gruppe gefunden.
                </li>
            </ul>

            <template v-if="draft.gateGroupId !== null">
                <label class="rr-admin__label rr-admin__label--ts">Teilstämme</label>
                <p class="rr-admin__help">
                    Ein kleiner Stamm trägt hier dieselbe Gruppe ein wie oben — dafür den Haken
                    entfernen.
                </p>
                <label class="rr-admin__toggle">
                    <input v-model="onlyChildren" type="checkbox" />
                    Nur Untergruppen des Hauptstamms anzeigen
                </label>

                <ul class="rr-admin__list">
                    <li
                        v-for="child in childCandidates"
                        :key="child.id"
                        class="rr-admin__option rr-admin__option--check"
                        :class="{
                            'rr-admin__option--selected': draft.teilstammIds.includes(child.id),
                        }"
                        @click="draft.teilstammIds = toggle(draft.teilstammIds, child.id)"
                    >
                        <input
                            class="rr-admin__checkbox"
                            type="checkbox"
                            :checked="draft.teilstammIds.includes(child.id)"
                            @click.stop="draft.teilstammIds = toggle(draft.teilstammIds, child.id)"
                        />
                        <span class="rr-admin__option-name">{{ child.title }}</span>
                        <span class="rr-admin__option-id">ID {{ child.id }}</span>
                    </li>
                    <li v-if="!childCandidates.length" class="rr-admin__list-empty">
                        Keine passenden Untergruppen — Haken entfernen, um alle Gruppen zu sehen.
                    </li>

                    <template v-if="!onlyChildren">
                        <li class="rr-admin__list-head">Weitere Gruppen</li>
                        <li
                            v-for="group in otherCandidates"
                            :key="group.id"
                            class="rr-admin__option rr-admin__option--check"
                            :class="{
                                'rr-admin__option--selected': draft.teilstammIds.includes(group.id),
                            }"
                            @click="draft.teilstammIds = toggle(draft.teilstammIds, group.id)"
                        >
                            <input
                                class="rr-admin__checkbox"
                                type="checkbox"
                                :checked="draft.teilstammIds.includes(group.id)"
                                @click.stop="
                                    draft.teilstammIds = toggle(draft.teilstammIds, group.id)
                                "
                            />
                            <span class="rr-admin__option-name">{{ group.name }}</span>
                            <span class="rr-admin__option-id">ID {{ group.id }}</span>
                        </li>
                    </template>
                </ul>

                <label class="rr-admin__label rr-admin__label--ts">
                    Welche Gruppen sind Teams?
                </label>
                <p class="rr-admin__help">
                    Unter den gewählten Teilstämmen gefunden. Nur die angehakten Typen zählen als
                    Team und fließen in die Zahlen ein.
                </p>
                <p v-if="scanning" class="rr-admin__help">Wird gelesen …</p>
                <ul v-else class="rr-admin__list">
                    <li
                        v-for="type in childTypeCounts"
                        :key="type.id"
                        class="rr-admin__option rr-admin__option--check"
                        :class="{
                            'rr-admin__option--selected': draft.teamGroupTypeIds.includes(type.id),
                        }"
                        @click="draft.teamGroupTypeIds = toggle(draft.teamGroupTypeIds, type.id)"
                    >
                        <input
                            class="rr-admin__checkbox"
                            type="checkbox"
                            :checked="draft.teamGroupTypeIds.includes(type.id)"
                            @click.stop="
                                draft.teamGroupTypeIds = toggle(draft.teamGroupTypeIds, type.id)
                            "
                        />
                        <span class="rr-admin__option-name">{{ type.name }}</span>
                        <span class="rr-admin__option-id">{{ type.count }} Gruppen</span>
                    </li>
                    <li v-if="!childTypeCounts.length" class="rr-admin__list-empty">
                        Unter den gewählten Teilstämmen liegen keine Untergruppen.
                    </li>
                </ul>

                <p class="rr-admin__preview">
                    Mit dieser Einstellung:
                    <strong>{{ draft.teilstammIds.length }}</strong> Teilstämme ·
                    <strong>{{ teamCount }}</strong> Teams ·
                    <strong>{{ personCount }}</strong> Personen
                </p>

                <h2 class="rr-admin__section">Zählregeln</h2>

                <label class="rr-admin__label">Wer zählt als Leiter?</label>
                <p class="rr-admin__help">
                    Was ChurchTools selbst als Leitung führt, zählt immer — auch eine Rolle, die ihr
                    später anlegt. Darunter die Teilnehmer-Rollen, die euer Stamm zusätzlich als
                    Mitarbeiter wertet.
                </p>
                <ul class="rr-admin__list">
                    <li
                        v-for="role in leadershipRoles"
                        :key="role.id"
                        class="rr-admin__option rr-admin__option--fixed"
                    >
                        <input class="rr-admin__checkbox" type="checkbox" checked disabled />
                        <span class="rr-admin__option-name">{{ role.label }}</span>
                        <span class="rr-admin__option-id">
                            immer · {{ roleHolders(role.id) }} Personen
                        </span>
                    </li>
                    <li
                        v-for="role in participantRoles"
                        :key="role.id"
                        class="rr-admin__option rr-admin__option--check"
                        :class="{
                            'rr-admin__option--selected': draft.extraLeaderRoleIds.includes(
                                role.id,
                            ),
                        }"
                        @click="
                            draft.extraLeaderRoleIds = toggle(draft.extraLeaderRoleIds, role.id)
                        "
                    >
                        <input
                            class="rr-admin__checkbox"
                            type="checkbox"
                            :checked="draft.extraLeaderRoleIds.includes(role.id)"
                            @click.stop="
                                draft.extraLeaderRoleIds = toggle(draft.extraLeaderRoleIds, role.id)
                            "
                        />
                        <span class="rr-admin__option-name">{{ role.label }}</span>
                        <span class="rr-admin__option-id">{{ roleHolders(role.id) }} Personen</span>
                    </li>
                </ul>

                <label class="rr-admin__label rr-admin__label--ts">
                    Unbesetzte Positionen sichtbar lassen
                </label>
                <p class="rr-admin__help">
                    Erscheint auf der Teilstamm-Karte als „nicht besetzt", statt zu fehlen.
                </p>
                <ul class="rr-admin__list">
                    <li
                        v-for="role in vacancyRoles"
                        :key="role.id"
                        class="rr-admin__option rr-admin__option--check"
                        :class="{
                            'rr-admin__option--selected': draft.alwaysShownRoleIds.includes(
                                role.id,
                            ),
                        }"
                        @click="
                            draft.alwaysShownRoleIds = toggle(draft.alwaysShownRoleIds, role.id)
                        "
                    >
                        <input
                            class="rr-admin__checkbox"
                            type="checkbox"
                            :checked="draft.alwaysShownRoleIds.includes(role.id)"
                            @click.stop="
                                draft.alwaysShownRoleIds = toggle(draft.alwaysShownRoleIds, role.id)
                            "
                        />
                        <span class="rr-admin__option-name">{{ role.label }}</span>
                    </li>
                </ul>

                <label class="rr-admin__label rr-admin__label--ts" for="rr-admin-horizont">
                    Mitgliederfeld für die Horizont-Kachel
                </label>
                <p class="rr-admin__help">
                    Leer lassen, wenn euer Stamm keine solche Bestellung führt — dann entfällt die
                    Kachel.
                    <template v-if="scan?.memberFieldNames.length">
                        Gefunden: {{ scan.memberFieldNames.join(', ') }}.
                    </template>
                </p>
                <input
                    id="rr-admin-horizont"
                    v-model="draft.horizontFieldName"
                    class="rr-admin__search"
                    type="text"
                    placeholder="z. B. Horizont"
                />

                <h2 class="rr-admin__section">Beiträge</h2>
                <p class="rr-admin__help">
                    Die letzte Zeile gilt für alle weiteren Kinder. „Ab dem dritten beitragsfrei"
                    ist also eine Staffel aus drei Zeilen, deren letzte 0,00 € ist.
                </p>

                <div
                    v-for="(cents, index) in draft.fees.childCents"
                    :key="index"
                    class="rr-admin__fee-row"
                >
                    <span class="rr-admin__fee-label">
                        {{ rungLabel(index, draft.fees.childCents.length) }}
                    </span>
                    <input
                        class="rr-admin__fee-input"
                        type="number"
                        min="0"
                        step="0.01"
                        :value="toEuro(cents)"
                        @change="setRung(index, ($event.target as HTMLInputElement).value)"
                    />
                    <span class="rr-admin__fee-unit">€</span>
                </div>
                <p v-if="!draft.fees.childCents.length" class="rr-admin__list-empty">
                    Noch keine Staffel — ohne sie bleibt die Beitragsabrechnung ungenutzt.
                </p>
                <div class="rr-admin__fee-actions">
                    <button type="button" class="rr-admin__button-small" @click="addRung">
                        + Weitere Position
                    </button>
                    <button
                        v-if="draft.fees.childCents.length"
                        type="button"
                        class="rr-admin__button-small"
                        @click="removeRung"
                    >
                        ✕ letzte entfernen
                    </button>
                </div>

                <div class="rr-admin__fee-row">
                    <span class="rr-admin__fee-label">Mitarbeiter</span>
                    <input
                        class="rr-admin__fee-input"
                        type="number"
                        min="0"
                        step="0.01"
                        :value="toEuro(draft.fees.staffCents)"
                        @change="
                            draft.fees = {
                                ...draft.fees,
                                staffCents: fromEuro(($event.target as HTMLInputElement).value),
                            }
                        "
                    />
                    <span class="rr-admin__fee-unit">€</span>
                </div>
                <div class="rr-admin__fee-row">
                    <span class="rr-admin__fee-label">Juniorleiter</span>
                    <input
                        class="rr-admin__fee-input"
                        type="number"
                        min="0"
                        step="0.01"
                        :value="toEuro(draft.fees.juniorLeaderCents)"
                        @change="
                            draft.fees = {
                                ...draft.fees,
                                juniorLeaderCents: fromEuro(
                                    ($event.target as HTMLInputElement).value,
                                ),
                            }
                        "
                    />
                    <span class="rr-admin__fee-unit">€</span>
                    <span class="rr-admin__fee-note">Leiter unter 18</span>
                </div>
            </template>

            <div class="rr-admin__actions">
                <button type="submit" class="rr-admin__button" :disabled="!canSave">
                    {{ saving ? 'Speichert …' : 'Speichern' }}
                </button>
                <span v-if="savedJustNow" class="rr-admin__success">Gespeichert.</span>
                <span v-if="saveError" class="rr-admin__error-inline" role="alert">
                    {{ saveError }}
                </span>
                <span v-else-if="!canSave" class="rr-admin__help">
                    Hauptstamm, mindestens ein Teilstamm und mindestens ein Team-Gruppentyp sind
                    nötig.
                </span>
            </div>
        </form>
    </main>
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

/* --- Sections and the new controls of the configuration screen --- */
.rr-admin__section {
    margin: 28px 0 4px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--rr-text-secondary);
    border-top: 0.5px solid var(--rr-border-tertiary);
    padding-top: 20px;
}
.rr-admin__section:first-of-type {
    border-top: 0;
    padding-top: 0;
    margin-top: 8px;
}

.rr-admin__chosen {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
}

.rr-admin__toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--rr-text-secondary);
    margin: 0 0 8px;
    cursor: pointer;
}

.rr-admin__list-head {
    padding: 10px 10px 4px;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--rr-text-secondary);
}

/* A role ChurchTools itself calls leadership: shown, counted, not togglable.
   Same layout as a checkable row, so the two lists read as one column. */
.rr-admin__option--fixed {
    opacity: 0.75;
    cursor: default;
    justify-content: flex-start;
}
.rr-admin__option--fixed .rr-admin__option-name {
    flex: 1;
}

.rr-admin__preview {
    margin: 12px 0 0;
    padding: 10px 12px;
    font-size: 13px;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
    color: var(--rr-text-secondary);
}
.rr-admin__preview strong {
    color: var(--rr-text-primary);
    font-variant-numeric: tabular-nums;
}

.rr-admin__fee-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}
.rr-admin__fee-label {
    flex: 0 0 150px;
    font-size: 13px;
}
.rr-admin__fee-input {
    width: 110px;
    padding: 6px 8px;
    font: inherit;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--rr-text-primary);
    background: var(--rr-bg-primary);
    border: 1px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
}
.rr-admin__fee-unit {
    font-size: 13px;
    color: var(--rr-text-secondary);
}
.rr-admin__fee-note {
    font-size: 12px;
    color: var(--rr-text-secondary);
}

.rr-admin__fee-actions {
    display: flex;
    gap: 8px;
    margin: 10px 0 4px;
}
.rr-admin__button-small {
    appearance: none;
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    padding: 6px 12px;
    font: inherit;
    font-size: 12px;
    color: var(--rr-text-primary);
    cursor: pointer;
}
.rr-admin__button-small:hover {
    background: var(--rr-bg-hover-on-white);
}

@media (max-width: 767px) {
    .rr-admin__fee-label {
        flex-basis: 110px;
    }
}
</style>
