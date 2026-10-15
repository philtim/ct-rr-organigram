<script setup lang="ts">
import type { TabId } from './tabs';
import { COPY } from './copy';

/** The views of the extension (ADR-007). Everyone past the gate sees all of them. */
const props = defineProps<{
    tabs: { id: TabId; label: string }[];
    active: TabId;
}>();

const emit = defineEmits<{ select: [TabId] }>();
</script>

<template>
    <nav class="rr-tabs" :aria-label="COPY.viewsNav">
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
        /* Three labels just exceed a 390px phone; tighter tabs fit, and the
           bar scrolls itself rather than the page should a label grow. */
        padding: 0 0.5rem;
        gap: 0;
        overflow-x: auto;
    }
    .rr-tabs__tab {
        flex-shrink: 0;
        padding: 0.75rem 0.625rem;
    }
}
</style>
