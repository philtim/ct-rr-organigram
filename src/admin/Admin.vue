<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CheckList from './CheckList.vue';
import type { CheckItem, CheckSection } from './CheckList.vue';
import FeeLadderEditor from './FeeLadderEditor.vue';
import HauptstammPicker from './HauptstammPicker.vue';
import { useAdminForm } from './useAdminForm';
import { COPY } from '@/shared/copy';

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

const {
    draft,
    scan,
    groups,
    hauptstamm,
    candidates,
    childrenFailed,
    typeCounts,
    preview,
    leadershipRoles,
    participantRoles,
    roleHolders,
    scanning,
    booting,
    loadError,
    saving,
    saveError,
    savedJustNow,
    canSave,
    selectHauptstamm,
    boot,
    submit,
} = useAdminForm();

onMounted(boot);

async function onSave() {
    if (await submit()) emit('saved');
}

const onlyChildren = ref(true);

const teilstammSections = computed<CheckSection[]>(() => {
    const { children, others } = candidates.value;
    const sections: CheckSection[] = [
        {
            items: children.map((c) => item(c.id, c.title, COPY.adminGroupId(c.id))),
            empty: childrenFailed.value ? COPY.adminChildrenUnavailable : COPY.adminNoChildren,
        },
    ];
    if (!onlyChildren.value) {
        sections.push({
            heading: COPY.adminOtherGroups,
            items: others.map((g) => item(g.id, g.name, COPY.adminGroupId(g.id))),
        });
    }
    return sections;
});

const teamTypeSections = computed<CheckSection[]>(() => [
    {
        items: typeCounts.value.map((t) => item(t.id, t.name, COPY.adminGroupCount(t.count))),
        empty: COPY.adminNoSubgroups,
    },
]);

const leaderSections = computed<CheckSection[]>(() => [
    {
        fixed: true,
        items: leadershipRoles.value.map((r) =>
            item(r.id, r.label, COPY.adminAlwaysCounts(roleHolders(r.id))),
        ),
    },
    {
        items: participantRoles.value.map((r) =>
            item(r.id, r.label, COPY.adminPersonCount(roleHolders(r.id))),
        ),
    },
]);

/** Only roles that can actually appear as a vacancy are worth offering. */
const vacancySections = computed<CheckSection[]>(() => [
    { items: leadershipRoles.value.map((r) => item(r.id, r.label)) },
]);

function item(id: number, label: string, meta?: string): CheckItem {
    return { id, label, meta };
}
</script>

<template>
    <main class="rr-admin">
        <header class="rr-admin__header">
            <p class="rr-admin__subtitle">
                {{ props.firstRun ? COPY.adminFirstRun : COPY.adminConfiguration }}
            </p>
            <h1 class="rr-admin__title">{{ COPY.appTitle }}</h1>
            <p class="rr-admin__lead">{{ COPY.adminLead }}</p>
        </header>

        <p v-if="booting" class="rr-admin__help">{{ COPY.loading }}</p>
        <p v-else-if="loadError" class="rr-admin__error" role="alert">
            {{ loadError }}
        </p>

        <form v-else class="rr-admin__form" @submit.prevent="onSave">
            <h2 class="rr-admin__section">{{ COPY.adminSectionStructure }}</h2>

            <label class="rr-admin__label" for="rr-admin-search">
                {{ COPY.adminHauptstammLabel }}
            </label>
            <p class="rr-admin__help">{{ COPY.adminHauptstammHelp }}</p>
            <HauptstammPicker :groups="groups" :selected="hauptstamm" @select="selectHauptstamm" />

            <template v-if="draft.gateGroupId !== null">
                <p class="rr-admin__label rr-admin__label--gap">
                    {{ COPY.adminTeilstaemmeLabel }}
                </p>
                <p class="rr-admin__help">{{ COPY.adminTeilstaemmeHelp }}</p>
                <label class="rr-admin__toggle">
                    <input v-model="onlyChildren" type="checkbox" />
                    {{ COPY.adminOnlyChildren }}
                </label>
                <CheckList
                    v-model="draft.teilstammIds"
                    :label="COPY.adminTeilstaemmeLabel"
                    :sections="teilstammSections"
                />

                <p class="rr-admin__label rr-admin__label--gap">{{ COPY.adminTeamsLabel }}</p>
                <p class="rr-admin__help">{{ COPY.adminTeamsHelp }}</p>
                <p v-if="scanning" class="rr-admin__help">{{ COPY.adminReading }}</p>
                <CheckList
                    v-else
                    v-model="draft.teamGroupTypeIds"
                    :label="COPY.adminTeamsLabel"
                    :sections="teamTypeSections"
                />

                <p v-if="scan?.incomplete" class="rr-admin__error-inline" role="alert">
                    {{ COPY.adminScanIncomplete }}
                </p>
                <p class="rr-admin__preview">
                    {{ COPY.adminPreviewLead }}
                    <strong>{{ preview.teilstaemme }}</strong>
                    {{ COPY.adminPreviewTeilstaemme }} · <strong>{{ preview.teams }}</strong>
                    {{ COPY.adminPreviewTeams }} ·
                    <strong>{{ preview.persons }}</strong>
                    {{ COPY.adminPreviewPersons }}
                </p>

                <h2 class="rr-admin__section">{{ COPY.adminSectionRules }}</h2>

                <p class="rr-admin__label">{{ COPY.adminLeadersLabel }}</p>
                <p class="rr-admin__help">{{ COPY.adminLeadersHelp }}</p>
                <CheckList
                    v-model="draft.extraLeaderRoleIds"
                    :label="COPY.adminLeadersLabel"
                    :sections="leaderSections"
                />

                <p class="rr-admin__label rr-admin__label--gap">{{ COPY.adminVacancyLabel }}</p>
                <p class="rr-admin__help">{{ COPY.adminVacancyHelp }}</p>
                <CheckList
                    v-model="draft.alwaysShownRoleIds"
                    :label="COPY.adminVacancyLabel"
                    :sections="vacancySections"
                />

                <label class="rr-admin__label rr-admin__label--gap" for="rr-admin-member-field">
                    {{ COPY.adminMemberFieldLabel }}
                </label>
                <p class="rr-admin__help">
                    {{ COPY.adminMemberFieldHelp }}
                    <template v-if="scan?.memberFieldNames.length">
                        {{ COPY.adminMemberFieldFound(scan.memberFieldNames) }}
                    </template>
                </p>
                <input
                    id="rr-admin-member-field"
                    v-model="draft.horizontFieldName"
                    class="rr-admin__text"
                    type="text"
                    :placeholder="COPY.adminMemberFieldPlaceholder"
                />

                <h2 class="rr-admin__section">{{ COPY.adminSectionFees }}</h2>
                <p class="rr-admin__help">{{ COPY.adminFeesHelp }}</p>
                <FeeLadderEditor v-model="draft.fees" />
            </template>

            <div class="rr-admin__actions">
                <button type="submit" class="rr-admin__button" :disabled="!canSave">
                    {{ saving ? COPY.adminSaving : COPY.adminSave }}
                </button>
                <span v-if="savedJustNow" class="rr-admin__success">
                    {{ COPY.adminSaved }}
                </span>
                <span v-if="saveError" class="rr-admin__error-inline" role="alert">
                    {{ saveError }}
                </span>
                <span v-else-if="!canSave" class="rr-admin__help">
                    {{ COPY.adminSaveIncomplete }}
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

.rr-admin__section {
    margin: 1.75rem 0 0.25rem;
    padding-top: 1.25rem;
    border-top: 0.5px solid var(--rr-border-tertiary);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--rr-text-secondary);
}
.rr-admin__section:first-of-type {
    margin-top: 0.5rem;
    padding-top: 0;
    border-top: 0;
}

.rr-admin__label {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
}
.rr-admin__label--gap {
    margin-top: 0.5rem;
}

.rr-admin__help {
    margin: -0.25rem 0 0;
    color: var(--rr-text-secondary);
    font-size: 0.8125rem;
    line-height: 1.4;
}

.rr-admin__toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.5rem;
    font-size: 0.8125rem;
    color: var(--rr-text-secondary);
    cursor: pointer;
}

.rr-admin__text {
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    border: 0.5px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-bg-primary);
    color: inherit;
}
.rr-admin__text:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 1px;
}

.rr-admin__preview {
    margin: 0.75rem 0 0;
    padding: 0.625rem 0.75rem;
    font-size: 0.8125rem;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
    color: var(--rr-text-secondary);
}
.rr-admin__preview strong {
    color: var(--rr-text-primary);
    font-variant-numeric: tabular-nums;
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
