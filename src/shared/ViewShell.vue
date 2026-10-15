<script setup lang="ts">
import { COPY } from './copy';

/**
 * The frame every tab shares: a full-width band carrying the background, a
 * centred column capped at 1600px, and a header with the title, a status line
 * and, where the view can reload, the refresh button.
 */
defineProps<{
    title: string;
    /** "Stand: …" once loaded, "Lädt …" before — whatever the view says. */
    status: string;
    /** Shows the refresh button; `loading` disables it while a load runs. */
    refreshable?: boolean;
    loading?: boolean;
}>();
defineEmits<{ refresh: [] }>();
</script>

<template>
    <main class="view">
        <div class="view__inner">
            <header class="view__header">
                <div class="view__title-block">
                    <h1 class="view__title">{{ title }}</h1>
                    <p class="view__status">{{ status }}</p>
                </div>
                <button
                    v-if="refreshable"
                    type="button"
                    class="view__refresh"
                    :aria-label="COPY.refresh"
                    :disabled="loading"
                    @click="$emit('refresh')"
                >
                    <span aria-hidden="true">↻</span>
                    <span class="view__refresh-label">{{ COPY.refresh }}</span>
                </button>
            </header>
            <slot />
        </div>
    </main>
</template>

<style scoped>
.view {
    background: var(--rr-bg-tertiary);
    color: var(--rr-text-primary);
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    min-height: 100vh;
}

.view__inner {
    /* Wider than the 1280px it started at, so a Stamm with many Teilstämme
       gets room on a large monitor; capped so lines stay readable. */
    max-width: 1600px;
    margin: 0 auto;
    padding: 24px;
}

.view__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
}

.view__title-block {
    min-width: 0;
}

.view__title {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 500;
}

.view__status {
    margin: 0;
    font-size: 13px;
    color: var(--rr-text-secondary);
}

.view__refresh {
    flex-shrink: 0;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--rr-text-primary);
    background: var(--rr-bg-primary);
    border: 1px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    cursor: pointer;
}
.view__refresh:disabled {
    opacity: 0.5;
    cursor: progress;
}
.view__refresh-label {
    margin-left: 4px;
}

/* Mobile: tighter padding, smaller title, the refresh label collapses to its icon. */
@media (max-width: 767px) {
    .view__inner {
        padding: 16px;
    }
    .view__title {
        font-size: 18px;
    }
    .view__refresh-label {
        display: none;
    }
}
</style>
