<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Admin from '@/admin/Admin.vue';
import Dashboard from '@/dashboard/Dashboard.vue';
import Gate from '@/gate/Gate.vue';
import { useAdminSettings } from '@/admin/useAdminSettings';
import { useGate } from '@/gate/useGate';
import { COPY } from '@/shared/constants';

// Routing: a single SPA serving both the dashboard and the admin form.
// The admin form is reachable via ?admin=1; the dashboard is the default.
// (Vue Router would be overkill for two routes with no history needs.)
const isAdminRoute = computed(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('admin') === '1';
});

const { settings, load: loadSettings } = useAdminSettings();
const { status: gateStatus, check: runGate } = useGate();
const ready = ref(false);

onMounted(async () => {
    if (isAdminRoute.value) {
        ready.value = true;
        return;
    }
    await loadSettings();
    await runGate(settings.value?.gateGroupId);
    ready.value = true;
});

// First-run: when nothing is configured yet, the App renders <Admin> directly
// instead of pointing the user to ?admin=1. After a successful save, re-run
// the gate so the dashboard appears without a manual reload.
async function handleSaved() {
    await loadSettings();
    await runGate(settings.value?.gateGroupId);
}
</script>

<template>
    <main v-if="!ready" class="rr-shell">
        <h1 class="rr-shell__title">{{ COPY.appTitle }}</h1>
        <p class="rr-shell__subtitle">{{ COPY.loading }}</p>
    </main>
    <Admin
        v-else-if="isAdminRoute || gateStatus.phase === 'config-missing'"
        :first-run="!isAdminRoute && gateStatus.phase === 'config-missing'"
        @saved="handleSaved"
    />
    <Dashboard
        v-else-if="
            gateStatus.phase === 'allowed' && settings && typeof settings.gateGroupId === 'number'
        "
        :person="gateStatus.person"
        :gate-group-id="settings.gateGroupId"
    />
    <Gate v-else :status="gateStatus" />
</template>

<!--
  Project-wide design tokens. Defined globally on .rr-dashboard-root so
  every descendant component (Admin, Gate, Dashboard, all cards, the
  toast, the skeleton) inherits the same values. The dark-mode override
  uses prefers-color-scheme so a host with native dark mode flips us
  along with itself (US-9 AC).
-->
<style>
.rr-dashboard-root {
    --rr-text-primary: #1a1a1a;
    --rr-text-secondary: #6b7280;
    --rr-bg-primary: #ffffff;
    --rr-bg-secondary: #f5f6f8;
    --rr-bg-tertiary: #ebedef;
    --rr-border-tertiary: #e5e7eb;
    --rr-border-secondary: #d1d5db;
    --rr-accent-bg: #b5d4f4;
    --rr-accent-fg: #0c447c;
    --rr-error-bg: #fef2f2;
    --rr-error-border: #fecaca;
    --rr-error-fg: #b91c1c;
    --rr-success-fg: #047857;
    --rr-radius-md: 8px;
    --rr-radius-lg: 12px;
    --rr-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.08);

    /* Hover surfaces — perceptible on white/grey without reading as "selected". */
    --rr-bg-hover-on-white: #eef0f3;
    --rr-bg-hover-on-grey: #e1e4e8;
    --rr-border-hover: #b8bec7;

    /* Motion — snappy, no overshoot. Joy comes from responsiveness, not bounce. */
    --rr-ease-out: cubic-bezier(0.2, 0, 0, 1);
    --rr-ease-press: cubic-bezier(0.4, 0, 1, 1);
    --rr-dur-hover: 140ms;
    --rr-dur-press: 60ms;
}

@media (prefers-color-scheme: dark) {
    .rr-dashboard-root {
        --rr-text-primary: #f3f4f6;
        --rr-text-secondary: #9ca3af;
        --rr-bg-primary: #1f2937;
        --rr-bg-secondary: #111827;
        --rr-bg-tertiary: #0b1220;
        --rr-border-tertiary: #374151;
        --rr-border-secondary: #4b5563;
        --rr-accent-bg: #1e3a5f;
        --rr-accent-fg: #b5d4f4;
        --rr-error-bg: #3f1d1f;
        --rr-error-border: #7f1d1d;
        --rr-error-fg: #fca5a5;
        --rr-success-fg: #6ee7b7;
        --rr-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.4);
        /* Dark hover: lighten the surface (mirrors the light-mode "darken"). */
        --rr-bg-hover-on-white: #2a3441;
        --rr-bg-hover-on-grey: #1a2332;
        --rr-border-hover: #6b7280;
    }
}
</style>

<style scoped>
.rr-shell {
    padding: 1.5rem;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: var(--rr-text-primary);
    background: var(--rr-bg-tertiary);
    min-height: 100vh;
}

.rr-shell__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}

.rr-shell__subtitle {
    font-size: 0.875rem;
    color: var(--rr-text-secondary);
    margin: 0.25rem 0 0;
}
</style>
