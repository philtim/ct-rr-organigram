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
                ↻ {{ COPY.refresh }}
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
/* Project-scoped CSS variables. Defined inside scoped styles so they
   apply within this component subtree but not to the host UI. */
.rr-dash {
    --rr-text-primary: #1a1a1a;
    --rr-text-secondary: #6b7280;
    --rr-bg-primary: #ffffff;
    --rr-bg-secondary: #f5f6f8;
    --rr-bg-tertiary: #ebedef;
    --rr-border-tertiary: #e5e7eb;
    --rr-border-secondary: #d1d5db;
    --rr-accent-bg: #b5d4f4;
    --rr-accent-fg: #0c447c;
    --rr-radius-md: 8px;
    --rr-radius-lg: 12px;

    max-width: 1280px;
    margin: 0 auto;
    padding: 24px;
    background: var(--rr-bg-tertiary);
    color: var(--rr-text-primary);
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
}

.rr-dash__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
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
}
.rr-dash__refresh:disabled {
    opacity: 0.5;
    cursor: progress;
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
    color: #b91c1c;
    background: #fef2f2;
    border: 0.5px solid #fecaca;
    border-radius: var(--rr-radius-md);
    padding: 0.75rem 1rem;
}
</style>
