<script setup lang="ts">
import { computed } from 'vue';
import type { OrgNode } from '@/shared/types';
import TeamChip from './TeamChip.vue';

const props = defineProps<{ node: OrgNode }>();
const isError = computed(() => Boolean(props.node.error));
</script>

<template>
    <article class="ts-card">
        <header class="ts-card__head">
            <p class="ts-card__subtitle">TEILSTAMM</p>
            <h3 class="ts-card__name">{{ node.name }}</h3>
        </header>

        <div class="ts-card__leiter-list">
            <span class="ts-card__label">Leiter</span>
            <template v-if="isError">
                <span class="ts-card__leiter-name">?</span>
            </template>
            <template v-else>
                <span
                    v-for="l in node.leaders"
                    :key="l.personId"
                    class="ts-card__leiter-name"
                >
                    {{ l.fullName }}
                </span>
                <span v-if="!node.leaders.length" class="ts-card__empty">
                    Keine Leiter eingetragen.
                </span>
            </template>
        </div>

        <div class="ts-card__stat-row">
            <div class="ts-card__stat">
                <p class="ts-card__stat-label">Leiter</p>
                <p class="ts-card__stat-value">
                    {{ isError ? '?' : node.leaderCount }}
                </p>
            </div>
            <div class="ts-card__stat">
                <p class="ts-card__stat-label">Mitglieder</p>
                <p class="ts-card__stat-value">
                    {{ isError ? '?' : node.memberCount }}
                </p>
            </div>
        </div>

        <section class="ts-card__teams">
            <p class="ts-card__subtitle">TEAMS</p>
            <p v-if="isError" class="ts-card__empty">
                Teams konnten nicht geladen werden.
            </p>
            <template v-else>
                <TeamChip v-for="team in node.children" :key="team.groupId" :node="team" />
                <p v-if="!node.children.length" class="ts-card__empty">Keine Teams.</p>
            </template>
        </section>
    </article>
</template>

<style scoped>
.ts-card {
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.ts-card__head {
    display: contents;
}
.ts-card__subtitle {
    margin: 0 0 2px;
    font-size: 11px;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
}
.ts-card__name {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
}
.ts-card__leiter-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.ts-card__label {
    font-size: 12px;
    color: var(--rr-text-secondary);
}
.ts-card__leiter-name {
    font-size: 13px;
}
.ts-card__empty {
    margin: 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
    font-style: italic;
}
.ts-card__stat-row {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}
.ts-card__stat {
    flex: 1;
}
.ts-card__stat-label {
    margin: 0;
    font-size: 11px;
    color: var(--rr-text-secondary);
}
.ts-card__stat-value {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
}
.ts-card__teams {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 8px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}
</style>
