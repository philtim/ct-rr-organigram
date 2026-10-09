<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Issue, IssueReason, Tally } from './tally';
import { COPY } from '@/shared/constants';

/**
 * Names people whose record stopped the table from placing them, and links to
 * ChurchTools so the gap can be closed there.
 *
 * It renders `name` and `frontendUrl` and nothing else — never the value that
 * is missing, never a date of birth, never the `sexId` behind "divers"
 * (ADR-013). The link is ChurchTools' own, so following it lands the reader in
 * the system that owns the data, under that system's permissions.
 */
const props = defineProps<{ tally: Tally }>();

/** How many names a group shows before it asks to be expanded. */
const PREVIEW_LIMIT = 10;

type Group = {
    reason: IssueReason;
    title: string;
    hint: string;
    issues: Issue[];
};

const GROUP_ORDER: { reason: IssueReason; title: string; hint: string }[] = [
    {
        reason: 'gender-missing',
        title: COPY.jahresmeldungQualityGenderMissing,
        hint: COPY.jahresmeldungQualityGenderMissingHint,
    },
    {
        reason: 'gender-diverse',
        title: COPY.jahresmeldungQualityGenderDiverse,
        hint: COPY.jahresmeldungQualityGenderDiverseHint,
    },
    {
        reason: 'age-unknown',
        title: COPY.jahresmeldungQualityAgeUnknown,
        hint: COPY.jahresmeldungQualityAgeUnknownHint,
    },
    {
        reason: 'multi-teilstamm',
        title: COPY.jahresmeldungQualityMulti,
        hint: COPY.jahresmeldungQualityMultiHint,
    },
];

const groups = computed<Group[]>(() =>
    GROUP_ORDER.map((def) => ({
        ...def,
        issues: props.tally.issues
            .filter((issue) => issue.reason === def.reason)
            .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    })),
);

/**
 * The lead line counts people, not issues: one person missing both a birthday
 * and a gender is one person the form cannot place, and saying "2" would
 * overstate the problem.
 */
const unplaceable = computed(
    () =>
        new Set(
            props.tally.issues.filter((i) => i.reason !== 'multi-teilstamm').map((i) => i.personId),
        ).size,
);

const hasAnything = computed(() => props.tally.issues.length > 0);

const expanded = ref<Set<IssueReason>>(new Set());

function visible(group: Group): Issue[] {
    return expanded.value.has(group.reason) ? group.issues : group.issues.slice(0, PREVIEW_LIMIT);
}

function expand(reason: IssueReason) {
    expanded.value = new Set(expanded.value).add(reason);
}
</script>

<template>
    <section class="jm-dq" aria-labelledby="jm-dq-title">
        <h2 id="jm-dq-title" class="jm-dq__title">{{ COPY.jahresmeldungQualityTitle }}</h2>

        <p v-if="!hasAnything" class="jm-dq__empty">{{ COPY.jahresmeldungQualityNone }}</p>

        <p v-else-if="unplaceable > 0" class="jm-dq__lead">
            {{ COPY.jahresmeldungQualityLead(unplaceable) }}
        </p>

        <div v-if="hasAnything" class="jm-dq__groups">
            <!--
              A filled group opens, an empty one stays shut but visible: "(0)"
              next to "Leiter ohne Geburtsdatum" tells the reader the check ran
              and found nothing, which a missing section would not.
            -->
            <details
                v-for="group in groups"
                :key="group.reason"
                class="jm-dq__group"
                :open="group.issues.length > 0"
            >
                <summary class="jm-dq__summary">
                    <span class="jm-dq__group-title">{{ group.title }}</span>
                    <span class="jm-dq__count">({{ group.issues.length }})</span>
                </summary>

                <p class="jm-dq__hint">{{ group.hint }}</p>

                <ul v-if="group.issues.length" class="jm-dq__list">
                    <li v-for="issue in visible(group)" :key="issue.personId" class="jm-dq__item">
                        <span class="jm-dq__name">{{ issue.name }}</span>
                        <span class="jm-dq__row">
                            {{ COPY.jahresmeldungQualityCountedIn(issue.rowLabel) }}
                        </span>
                        <a
                            v-if="issue.frontendUrl"
                            class="jm-dq__link"
                            :href="issue.frontendUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {{ COPY.jahresmeldungQualityPersonLink }} ↗
                        </a>
                    </li>
                </ul>

                <button
                    v-if="group.issues.length > PREVIEW_LIMIT && !expanded.has(group.reason)"
                    type="button"
                    class="jm-dq__more"
                    @click="expand(group.reason)"
                >
                    {{ COPY.jahresmeldungQualityShowAll(group.issues.length - PREVIEW_LIMIT) }}
                </button>
            </details>
        </div>
    </section>
</template>

<style scoped>
.jm-dq {
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px 20px;
}

.jm-dq__title {
    margin: 0 0 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.jm-dq__empty {
    margin: 0;
    font-size: 13px;
    color: var(--rr-text-secondary);
    font-style: italic;
}

.jm-dq__lead {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.45;
    /* Carries the weight a warning glyph would have; U+26A0 renders as a
       tofu box in the host's font stack. */
    font-weight: 500;
}

.jm-dq__groups {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.jm-dq__group {
    border-top: 0.5px solid var(--rr-border-tertiary);
    padding-top: 10px;
}

.jm-dq__summary {
    cursor: pointer;
    font-size: 13px;
    display: flex;
    gap: 6px;
    align-items: baseline;
}

.jm-dq__summary:focus-visible {
    outline: 2px solid var(--rr-text-primary);
    outline-offset: 2px;
    border-radius: 4px;
}

.jm-dq__group-title {
    font-weight: 500;
}

.jm-dq__count {
    color: var(--rr-text-secondary);
    font-variant-numeric: tabular-nums;
}

.jm-dq__hint {
    margin: 6px 0 10px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--rr-text-secondary);
}

.jm-dq__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.jm-dq__item {
    flex: 1 1 220px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
}

.jm-dq__name {
    font-size: 13px;
    font-weight: 500;
}

.jm-dq__row {
    font-size: 12px;
    color: var(--rr-text-secondary);
}

.jm-dq__link {
    font-size: 12px;
    color: var(--rr-accent-fg);
    text-decoration: none;
    width: fit-content;
}

.jm-dq__link:hover,
.jm-dq__link:focus-visible {
    text-decoration: underline;
}

.jm-dq__more {
    margin-top: 8px;
    appearance: none;
    background: none;
    border: 0.5px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    padding: 6px 12px;
    font: inherit;
    font-size: 12px;
    color: var(--rr-text-primary);
    cursor: pointer;
}

.jm-dq__more:hover {
    background: var(--rr-bg-hover-on-white);
}

@media (max-width: 767px) {
    .jm-dq {
        padding: 14px;
    }
}
</style>
