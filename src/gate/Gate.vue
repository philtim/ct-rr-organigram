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
    color: #1f2937;
}

.rr-gate__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 1rem;
}

.rr-gate__panel {
    border: 0.5px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    background: #fff;
}

.rr-gate__panel--warn {
    border-color: #fde68a;
    background: #fffbeb;
}

.rr-gate__panel--error {
    border-color: #fecaca;
    background: #fef2f2;
}

.rr-gate__message {
    margin: 0;
    line-height: 1.5;
}

.rr-gate__hint {
    margin: 0.5rem 0 0;
    color: #6b7280;
    font-size: 0.875rem;
}

code {
    background: rgba(0, 0, 0, 0.05);
    padding: 0.05em 0.35em;
    border-radius: 4px;
    font-size: 0.85em;
}
</style>
