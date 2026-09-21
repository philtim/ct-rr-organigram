<script setup lang="ts">
import type { OrgNode } from '@/shared/types';
import { computed } from 'vue';
import { getGroupFrontendUrl } from '@/shared/api';

const props = defineProps<{ node: OrgNode }>();

const isError = computed(() => Boolean(props.node.error));
const leaderNames = computed(() => props.node.leaders.map((l) => l.fullName).join(', '));
const href = computed(() => getGroupFrontendUrl(props.node.groupId));
// Variante C counts, written out below the leader names and separated
// from them by a divider. Leiter + Teilnehmer share one line; Horizont
// gets its own line and only appears when at least one member ordered
// one, so teams without the field (e.g. Entdecker) stay one line shorter.
const countsText = computed(() => {
    if (isError.value) return '? Leiter · ? Teilnehmer';
    return `${props.node.leaderCount} Leiter · ${props.node.memberCount} Teilnehmer`;
});
const horizontText = computed(() =>
    !isError.value && props.node.horizontCount > 0
        ? `${props.node.horizontCount}× Horizont`
        : null,
);
</script>

<template>
    <a
        class="team-chip"
        :href="href"
        :aria-label="`Zur ChurchTools-Gruppe von ${node.name} wechseln`"
    >
        <div class="team-chip__row">
            <span class="team-chip__name">{{ node.name }}</span>
        </div>
        <span v-if="isError" class="team-chip__leiter">?</span>
        <span v-else-if="leaderNames" class="team-chip__leiter">{{ leaderNames }}</span>
        <div class="team-chip__meta">
            <span class="team-chip__meta-line">{{ countsText }}</span>
            <span v-if="horizontText" class="team-chip__meta-line">{{ horizontText }}</span>
        </div>
    </a>
</template>

<style scoped>
.team-chip {
    display: block;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
    padding: 8px 10px;
    color: inherit;
    text-decoration: none;
    /* Inset 1px ring acts as a "border" without affecting layout. Transparent
       at rest so only hover/focus reveals it. */
    box-shadow: inset 0 0 0 1px transparent;
    transition:
        background-color var(--rr-dur-hover) var(--rr-ease-out),
        box-shadow var(--rr-dur-hover) var(--rr-ease-out);
}
.team-chip:hover,
.team-chip:focus-visible {
    background: var(--rr-bg-hover-on-white);
    box-shadow: inset 0 0 0 1px var(--rr-border-hover);
}
.team-chip:active {
    background: var(--rr-bg-hover-on-grey);
    transition-duration: var(--rr-dur-press);
    transition-timing-function: var(--rr-ease-press);
}
.team-chip:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
    .team-chip {
        transition-duration: 0ms;
    }
}
.team-chip__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 2px;
}
.team-chip__name {
    font-size: 13px;
    font-weight: 500;
}
.team-chip__leiter {
    display: block;
    font-size: 12px;
    color: var(--rr-text-secondary);
    line-height: 1.4;
}
.team-chip__meta {
    margin-top: 6px;
    padding-top: 4px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}
.team-chip__meta-line {
    display: block;
    font-size: 12px;
    color: var(--rr-text-secondary);
    line-height: 1.4;
}
</style>
