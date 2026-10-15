<script setup lang="ts">
import { computed } from 'vue';
import type { OrgNode } from './types';
import { COPY } from '@/shared/copy';
import PersonLink from '@/shared/PersonLink.vue';
import { getGroupFrontendUrl } from '@/shared/api';

/**
 * A Sammelgruppe: leaders who belong to the Stamm without a team, such as
 * former leaders (`Settings.collectionGroupIds`). Built from the Teilstamm
 * card's parts — type line, name, a labelled list, a stat tile — so it reads
 * as one of the family, but without what does not apply: no positions, no
 * team chips, no Teilnehmer. The list scrolls inside the card, so a
 * long-serving Stamm's group does not stretch the page.
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
            <p class="col-card__subtitle">{{ COPY.levelCollection }}</p>
            <h3 class="col-card__name">
                <a
                    class="col-card__group-link"
                    :href="href"
                    :aria-label="COPY.openGroup(node.name)"
                >
                    {{ node.name }}
                </a>
            </h3>
            <!-- Phone only, in place of the stat row: the Teilstamm card's compact line. -->
            <p class="col-card__compact-count">{{ COPY.collectionCompactCount(people.length) }}</p>
        </header>

        <div class="col-card__people">
            <span class="col-card__label">{{ COPY.leiterStat }}</span>
            <span v-if="node.error" class="col-card__empty">{{ COPY.collectionUnavailable }}</span>
            <span v-else-if="!people.length" class="col-card__empty">{{
                COPY.collectionEmpty
            }}</span>
            <!-- Focusable, so the list can be scrolled from the keyboard too. -->
            <div
                v-else
                class="col-card__list"
                role="region"
                tabindex="0"
                :aria-label="COPY.collectionListLabel(node.name)"
            >
                <ul class="col-card__names">
                    <li v-for="p in people" :key="p.personId" class="col-card__person">
                        <PersonLink v-if="p.frontendUrl" :name="p.fullName" :href="p.frontendUrl" />
                        <span v-else>{{ p.fullName }}</span>
                    </li>
                </ul>
            </div>
        </div>

        <div class="col-card__stat-row">
            <div class="col-card__stat">
                <p class="col-card__stat-label">{{ COPY.leiterStat }}</p>
                <p
                    v-if="node.error"
                    class="col-card__stat-value col-card__stat-value--unknown"
                    :aria-label="COPY.notComputable"
                >
                    ?
                </p>
                <p v-else class="col-card__stat-value">{{ people.length }}</p>
            </div>
        </div>
    </article>
</template>

<style scoped>
/* The Teilstamm card's measures (TeilstammCard.vue), so both read as one family. */
.col-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
}

.col-card__head {
    /* The Teilstamm card's type line sits in its 12px flex gap; same here. */
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.col-card__compact-count {
    display: none;
}

.col-card__subtitle {
    margin: 0 0 2px;
    font-size: 11px;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
}

.col-card__name {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
}
.col-card__group-link {
    color: inherit;
    text-decoration: none;
}
.col-card__group-link:hover {
    text-decoration: underline;
}
.col-card__group-link:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
    border-radius: 2px;
}

.col-card__people {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.col-card__label {
    font-size: 12px;
    color: var(--rr-text-secondary);
}

.col-card__list {
    max-height: 240px;
    overflow-y: auto;
}
.col-card__list:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
    border-radius: 2px;
}
.col-card__names {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
}
.col-card__person {
    font-size: 13px;
}

.col-card__empty {
    font-size: 12px;
    color: var(--rr-text-secondary);
    font-style: italic;
}

.col-card__stat-row {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}
.col-card__stat {
    flex: 1;
}
.col-card__stat-label {
    margin: 0;
    font-size: 11px;
    color: var(--rr-text-secondary);
}
.col-card__stat-value {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
}
.col-card__stat-value--unknown {
    color: var(--rr-error-fg);
}

/* Phone: the Teilstamm card's compact measures — no type line, no label, no
   stat row; name, a count line, then the names. */
@media (max-width: 767px) {
    .col-card {
        padding: 12px 14px;
        gap: 6px;
    }
    .col-card__head {
        /* 4px under the name, as under the compact Teilstamm name. */
        gap: 4px;
    }
    .col-card__subtitle,
    .col-card__label,
    .col-card__stat-row {
        display: none;
    }
    .col-card__name {
        font-size: 14px;
    }
    .col-card__compact-count {
        display: block;
        margin: 0;
        font-size: 11px;
        color: var(--rr-text-secondary);
    }
    .col-card__person {
        font-size: 12px;
    }
    .col-card__list {
        max-height: 160px;
    }
}

/* On paper nothing scrolls: every name is printed. */
@media print {
    .col-card__list {
        max-height: none;
        overflow: visible;
    }
}
</style>
