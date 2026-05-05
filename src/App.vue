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
</script>

<template>
    <main v-if="!ready" class="rr-shell">
        <h1 class="rr-shell__title">{{ COPY.appTitle }}</h1>
        <p class="rr-shell__subtitle">{{ COPY.loading }}</p>
    </main>
    <Admin v-else-if="isAdminRoute" />
    <Dashboard
        v-else-if="
            gateStatus.phase === 'allowed' && settings && typeof settings.gateGroupId === 'number'
        "
        :person="gateStatus.person"
        :gate-group-id="settings.gateGroupId"
    />
    <Gate v-else :status="gateStatus" />
</template>

<style scoped>
.rr-shell {
    padding: 1.5rem;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1f2937;
}

.rr-shell__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}

.rr-shell__subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0.25rem 0 0;
}
</style>
