<script setup lang="ts">
import type { Tally } from './tally';
import { COPY } from '@/shared/constants';

/**
 * Names the people behind the "Mitarbeiter ohne Team" row.
 *
 * Every other row can be checked by opening the team; this one cannot, and it
 * is the row most likely to be wrong — somebody taken out of a team but left in
 * the Teilstamm lands here without anyone noticing. Seeing who it is turns an
 * unexplained figure into something that can be acted on.
 *
 * Renders a name and ChurchTools' own person link, nothing else (ADR-013). The
 * organigram's "Hinweise" panel already lists the same people.
 */
defineProps<{ tally: Tally }>();
</script>

<template>
    <section class="jm-ot" aria-labelledby="jm-ot-title">
        <h2 id="jm-ot-title" class="jm-ot__title">{{ COPY.jahresmeldungOhneTeamTitle }}</h2>

        <p v-if="!tally.ohneTeam.length" class="jm-ot__empty">
            {{ COPY.jahresmeldungOhneTeamEmpty }}
        </p>

        <template v-else>
            <p class="jm-ot__hint">{{ COPY.jahresmeldungOhneTeamHint }}</p>
            <ul class="jm-ot__list">
                <li v-for="entry in tally.ohneTeam" :key="entry.personId" class="jm-ot__item">
                    <span class="jm-ot__name">{{ entry.name }}</span>
                    <a
                        v-if="entry.frontendUrl"
                        class="jm-ot__link"
                        :href="entry.frontendUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {{ COPY.jahresmeldungQualityPersonLink }} ↗
                    </a>
                </li>
            </ul>
        </template>
    </section>
</template>

<style scoped>
.jm-ot {
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px 20px;
}

.jm-ot__title {
    margin: 0 0 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.jm-ot__empty {
    margin: 0;
    font-size: 13px;
    color: var(--rr-text-secondary);
    font-style: italic;
}

.jm-ot__hint {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--rr-text-secondary);
}

.jm-ot__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.jm-ot__item {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
}

.jm-ot__name {
    font-size: 13px;
    font-weight: 500;
    min-width: 0;
}

.jm-ot__link {
    font-size: 12px;
    color: var(--rr-accent-fg);
    text-decoration: none;
    flex-shrink: 0;
}

.jm-ot__link:hover,
.jm-ot__link:focus-visible {
    text-decoration: underline;
}

@media (max-width: 767px) {
    .jm-ot {
        padding: 14px;
    }
}
</style>
