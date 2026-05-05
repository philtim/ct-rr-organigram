<script setup lang="ts">
import { COPY } from '@/shared/constants';
import type { GatePerson } from '@/gate/useGate';

defineProps<{ person: GatePerson; gateGroupId: number }>();
</script>

<template>
    <section class="rr-dashboard-shell">
        <header class="rr-dashboard-shell__header">
            <p class="rr-dashboard-shell__subtitle">DASHBOARD (PLACEHOLDER)</p>
            <h1 class="rr-dashboard-shell__title">{{ COPY.appTitle }}</h1>
            <p class="rr-dashboard-shell__hint">
                Hallo {{ person.firstName }} {{ person.lastName }}. Du bist Mitglied der
                konfigurierten Hauptstamm-Gruppe (ID {{ gateGroupId }}). Das eigentliche Organigramm
                folgt in US-3 / US-9.
            </p>
        </header>
    </section>
</template>

<style scoped>
.rr-dashboard-shell {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 1.5rem;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1f2937;
}

.rr-dashboard-shell__subtitle {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    color: #6b7280;
}

.rr-dashboard-shell__title {
    margin: 0.25rem 0 0.75rem;
    font-size: 1.5rem;
    font-weight: 600;
}

.rr-dashboard-shell__hint {
    margin: 0;
    color: #4b5563;
    line-height: 1.5;
}
</style>
