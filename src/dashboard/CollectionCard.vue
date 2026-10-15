<script setup lang="ts">
import { computed } from 'vue';
import type { OrgNode } from './types';
import { COPY } from '@/shared/copy';
import PersonLink from '@/shared/PersonLink.vue';
import { getGroupFrontendUrl } from '@/shared/api';

/**
 * A Sammelgruppe: leaders who belong to the Stamm without a team, such as
 * former leaders (`Settings.collectionGroupIds`). Not a Teilstamm, so none of
 * its furniture — no positions, no team chips, no Teilnehmer tile — only who
 * is in it. The list scrolls inside the card, so a long-serving Stamm's group
 * does not stretch the page.
 */
const props = defineProps<{ node: OrgNode }>();

const people = computed(() =>
    [...props.node.leaders].sort((a, b) => a.fullName.localeCompare(b.fullName, 'de')),
);
const href = computed(() => getGroupFrontendUrl(props.node.groupId));
</script>

<template>
    <article class="col-card">
        <header class="col-card__head">
            <a class="col-card__name" :href="href" :aria-label="COPY.openGroup(node.name)">
                {{ node.name }}
            </a>
            <span
                v-if="node.error"
                class="col-card__count col-card__count--unknown"
                :aria-label="COPY.notComputable"
                >?</span
            >
            <span v-else class="col-card__count">{{ COPY.collectionCount(people.length) }}</span>
        </header>

        <p v-if="node.error" class="col-card__empty">{{ COPY.collectionUnavailable }}</p>
        <p v-else-if="!people.length" class="col-card__empty">{{ COPY.collectionEmpty }}</p>
        <!-- Focusable, so the list can be scrolled from the keyboard too. -->
        <div
            v-else
            class="col-card__list"
            role="region"
            tabindex="0"
            :aria-label="COPY.collectionListLabel(node.name)"
        >
            <ul class="col-card__people">
                <li v-for="p in people" :key="p.personId" class="col-card__person">
                    <PersonLink v-if="p.frontendUrl" :name="p.fullName" :href="p.frontendUrl" />
                    <span v-else>{{ p.fullName }}</span>
                </li>
            </ul>
        </div>
    </article>
</template>

<style scoped>
.col-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    background: var(--rr-bg-secondary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
}

.col-card__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
}

.col-card__name {
    font-size: 15px;
    font-weight: 500;
    color: inherit;
    text-decoration: none;
}
.col-card__name:hover {
    text-decoration: underline;
}
.col-card__name:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
    border-radius: 2px;
}

.col-card__count {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
    font-variant-numeric: tabular-nums;
}
.col-card__count--unknown {
    color: var(--rr-error-fg);
    font-weight: 500;
}

.col-card__list {
    max-height: 240px;
    overflow-y: auto;
    padding-top: 6px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}
.col-card__people {
    margin: 0;
    padding: 0;
    list-style: none;
}
.col-card__list:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
    border-radius: 2px;
}

.col-card__person {
    padding: 3px 0;
    font-size: 13px;
}

.col-card__empty {
    margin: 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
    font-style: italic;
}

/* On paper nothing scrolls: every name is printed. */
@media print {
    .col-card__list {
        max-height: none;
        overflow: visible;
    }
}
</style>
