<script setup lang="ts">
import type { GateStatus } from './useGate';
import { COPY } from '@/shared/constants';

defineProps<{ status: GateStatus }>();
</script>

<template>
    <section class="rr-gate">
        <h1 class="rr-gate__title">{{ COPY.appTitle }}</h1>

        <div v-if="status.phase === 'loading'" class="rr-gate__panel">
            <p class="rr-gate__message">{{ COPY.loading }}</p>
        </div>

        <div v-else-if="status.phase === 'config-missing'" class="rr-gate__panel">
            <p class="rr-gate__message">
                {{ COPY.configMissing }}
            </p>
            <p class="rr-gate__hint">
                Admins erreichen die Konfiguration über
                <code>?admin=1</code> in der URL.
            </p>
        </div>

        <div v-else-if="status.phase === 'denied'" class="rr-gate__panel rr-gate__panel--warn">
            <p class="rr-gate__message">{{ COPY.accessDenied }}</p>
        </div>

        <div v-else-if="status.phase === 'error'" class="rr-gate__panel rr-gate__panel--error">
            <p class="rr-gate__message">{{ status.message }}</p>
        </div>
    </section>
</template>

<style scoped>
.rr-gate {
    max-width: 640px;
    margin: 2rem auto;
    padding: 1.5rem;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: var(--rr-text-primary);
}

.rr-gate__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 1rem;
}

.rr-gate__panel {
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 1.25rem 1.5rem;
    background: var(--rr-bg-primary);
}

.rr-gate__panel--warn {
    border-color: var(--rr-error-border);
    background: var(--rr-error-bg);
}

.rr-gate__panel--error {
    border-color: var(--rr-error-border);
    background: var(--rr-error-bg);
    color: var(--rr-error-fg);
}

.rr-gate__message {
    margin: 0;
    line-height: 1.5;
}

.rr-gate__hint {
    margin: 0.5rem 0 0;
    color: var(--rr-text-secondary);
    font-size: 0.875rem;
}

code {
    background: var(--rr-bg-secondary);
    padding: 0.05em 0.35em;
    border-radius: 4px;
    font-size: 0.85em;
}

@media (max-width: 767px) {
    .rr-gate {
        margin: 1rem auto;
        padding: 1rem;
    }
}
</style>
