<script setup lang="ts">
import type { TabId } from './tabs';

/**
 * Renders only the tabs the current user may open. Hiding a tab is
 * presentation only — the view behind it re-checks its own access rule
 * (ADR-008), so a hand-typed URL is still denied.
 *
 * With a single available tab the bar renders nothing: a one-tab tab bar is
 * chrome without information, and the organigram looked fine without it.
 */
const props = defineProps<{
    tabs: { id: TabId; label: string }[];
    active: TabId;
}>();

const emit = defineEmits<{ select: [TabId] }>();
</script>

<template>
    <nav v-if="props.tabs.length > 1" class="rr-tabs" aria-label="Ansichten">
        <button
            v-for="tab in props.tabs"
            :key="tab.id"
            type="button"
            class="rr-tabs__tab"
            :class="{ 'rr-tabs__tab--active': tab.id === props.active }"
            :aria-current="tab.id === props.active ? 'page' : undefined"
            @click="emit('select', tab.id)"
        >
            {{ tab.label }}
        </button>
    </nav>
</template>

<style scoped>
.rr-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0 1.5rem;
    border-bottom: 0.5px solid var(--rr-border-tertiary);
    background: var(--rr-bg-primary);
}

.rr-tabs__tab {
    appearance: none;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    padding: 0.75rem 0.875rem;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    color: var(--rr-text-secondary);
    cursor: pointer;
}

.rr-tabs__tab:hover {
    color: var(--rr-text-primary);
}

.rr-tabs__tab:focus-visible {
    outline: 2px solid var(--rr-text-primary);
    outline-offset: -2px;
}

.rr-tabs__tab--active {
    color: var(--rr-text-primary);
    border-bottom-color: var(--rr-text-primary);
}

@media (max-width: 767px) {
    .rr-tabs {
        padding: 0 1rem;
    }
}
</style>
