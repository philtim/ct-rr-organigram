<script setup lang="ts">
import { computed } from 'vue';
import type { OrgNode } from '@/shared/types';

const props = defineProps<{ node: OrgNode }>();
const isError = computed(() => Boolean(props.node.error));
</script>

<template>
    <article class="hs-card">
        <div class="hs-card__row">
            <div class="hs-card__main">
                <p class="hs-card__subtitle">HAUPTSTAMM</p>
                <h2 class="hs-card__name">{{ node.name }}</h2>
                <p class="hs-card__label">Leiter</p>
                <p v-if="isError" class="hs-card__placeholder" aria-label="unbekannt">?</p>
                <div v-else-if="node.leaders.length" class="hs-card__pills">
                    <span v-for="l in node.leaders" :key="l.personId" class="hs-card__pill">
                        <span class="hs-card__avatar">{{ l.initials }}</span>
                        {{ l.fullName }}
                    </span>
                </div>
                <p v-else class="hs-card__empty">Keine Leiter eingetragen.</p>
            </div>
            <div class="hs-card__stats">
                <div class="hs-card__stat-tile">
                    <p class="hs-card__stat-label">Leiter</p>
                    <p class="hs-card__stat-value">
                        {{ isError ? '?' : node.leaderCount }}
                    </p>
                </div>
                <div class="hs-card__stat-tile">
                    <p class="hs-card__stat-label">Mitglieder</p>
                    <p class="hs-card__stat-value">
                        {{ isError ? '?' : node.memberCount }}
                    </p>
                </div>
            </div>
        </div>
    </article>
</template>

<style scoped>
.hs-card {
    background: var(--rr-bg-secondary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 20px 24px;
}
.hs-card__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
}
.hs-card__main {
    flex: 1;
    min-width: 0;
}
.hs-card__subtitle {
    margin: 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
}
.hs-card__name {
    margin: 4px 0 12px;
    font-size: 18px;
    font-weight: 500;
}
.hs-card__label {
    margin: 0 0 6px;
    font-size: 12px;
    color: var(--rr-text-secondary);
}
.hs-card__pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.hs-card__pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--rr-bg-primary);
    border-radius: var(--rr-radius-md);
    padding: 4px 10px;
    font-size: 13px;
}
.hs-card__avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--rr-accent-bg);
    color: var(--rr-accent-fg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 500;
}
.hs-card__empty {
    margin: 0;
    font-size: 13px;
    color: var(--rr-text-secondary);
    font-style: italic;
}
.hs-card__placeholder {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: var(--rr-text-secondary);
}
.hs-card__stats {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
}
.hs-card__stat-tile {
    background: var(--rr-bg-primary);
    border-radius: var(--rr-radius-md);
    padding: 12px 16px;
    min-width: 88px;
}
.hs-card__stat-label {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--rr-text-secondary);
}
.hs-card__stat-value {
    margin: 0;
    font-size: 24px;
    font-weight: 500;
}
</style>
