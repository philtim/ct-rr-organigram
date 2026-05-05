<script setup lang="ts">
import { computed, onMounted } from 'vue';
import HauptstammCard from './HauptstammCard.vue';
import SkeletonLayout from './SkeletonLayout.vue';
import TeilstammCard from './TeilstammCard.vue';
import Toast from './Toast.vue';
import { formatTimestamp, useDashboard } from './useDashboard';
import { COPY } from '@/shared/constants';
import type { GatePerson } from '@/gate/useGate';

const props = defineProps<{ person: GatePerson; gateGroupId: number }>();

const { state, load } = useDashboard();

onMounted(() => {
    load(props.gateGroupId);
});

const stand = computed(() =>
    state.value.phase === 'ready' ? formatTimestamp(state.value.loadedAt) : null,
);
const showErrorToast = computed(
    () => state.value.phase === 'ready' && state.value.hasErrors,
);
</script>

<template>
    <main class="rr-dash">
        <header class="rr-dash__header">
            <div class="rr-dash__title-block">
                <h1 class="rr-dash__title">{{ COPY.appTitle }}</h1>
                <p class="rr-dash__subtitle">
                    <template v-if="stand">{{ COPY.timestampPrefix }}{{ stand }}</template>
                    <template v-else>{{ COPY.loading }}</template>
                </p>
            </div>
            <button
                type="button"
                class="rr-dash__refresh"
                :disabled="state.phase === 'loading'"
                @click="load(gateGroupId)"
            >
                ↻ <span class="rr-dash__refresh-label">{{ COPY.refresh }}</span>
            </button>
        </header>

        <SkeletonLayout v-if="state.phase === 'loading' || state.phase === 'idle'" />

        <template v-else-if="state.phase === 'ready'">
            <HauptstammCard :node="state.root" />
            <div class="rr-dash__divider" aria-hidden="true">│</div>
            <div class="rr-dash__grid">
                <TeilstammCard v-for="ts in state.root.children" :key="ts.groupId" :node="ts" />
                <p v-if="!state.root.children.length" class="rr-dash__empty">
                    Keine Teilstämme angelegt.
                </p>
            </div>
        </template>

        <p v-else-if="state.phase === 'error'" class="rr-dash__error" role="alert">
            {{ state.message }}
        </p>

        <Toast :visible="showErrorToast" :message="COPY.partialErrorToast" />
    </main>
</template>

<style scoped>
/*
 * Layout-only here. Color tokens come from the global .rr-dashboard-root
 * variables defined in App.vue (light + dark via prefers-color-scheme).
 */
.rr-dash {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px;
    background: var(--rr-bg-tertiary);
    color: var(--rr-text-primary);
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
        sans-serif;
    font-size: 14px;
    min-height: 100vh;
}

.rr-dash__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 12px;
}
.rr-dash__title-block {
    min-width: 0;
}
.rr-dash__title {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 500;
}
.rr-dash__subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--rr-text-secondary);
}
.rr-dash__refresh {
    background: var(--rr-bg-primary);
    border: 1px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--rr-text-primary);
    flex-shrink: 0;
}
.rr-dash__refresh:disabled {
    opacity: 0.5;
    cursor: progress;
}
.rr-dash__refresh-label {
    margin-left: 4px;
}

.rr-dash__divider {
    text-align: center;
    color: var(--rr-border-secondary);
    margin: 0 0 16px;
    font-size: 18px;
    line-height: 1;
}

.rr-dash__grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    align-items: start;
}

.rr-dash__empty {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--rr-text-secondary);
    font-style: italic;
}

.rr-dash__error {
    margin-top: 1rem;
    color: var(--rr-error-fg);
    background: var(--rr-error-bg);
    border: 0.5px solid var(--rr-error-border);
    border-radius: var(--rr-radius-md);
    padding: 0.75rem 1rem;
}

/* Intermediate viewports — accept 2 cards per row with full team detail. */
@media (max-width: 1023px) {
    .rr-dash__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

/* Mobile: single-column stack, hide the inter-level divider, condense
   the header (the refresh label collapses to just the icon). */
@media (max-width: 767px) {
    .rr-dash {
        padding: 16px;
    }
    .rr-dash__grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
    }
    .rr-dash__divider {
        display: none;
    }
    .rr-dash__title {
        font-size: 18px;
    }
    .rr-dash__refresh-label {
        display: none;
    }
}
</style>
