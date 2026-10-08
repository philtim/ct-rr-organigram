<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Admin from '@/admin/Admin.vue';
import Dashboard from '@/dashboard/Dashboard.vue';
import Beitraege from '@/beitraege/Beitraege.vue';
import SetupHint from '@/beitraege/SetupHint.vue';
import Gate from '@/shared/access/Gate.vue';
import TabBar from '@/shared/TabBar.vue';
import { useAdminSettings } from '@/admin/useAdminSettings';
import { useAccessGate } from '@/shared/access/useAccessGate';
import type { AccessStatus } from '@/shared/access/useAccessGate';
import { membershipRule, roleRule } from '@/shared/access/rules';
import { readTabFromUrl, writeTabToUrl } from '@/shared/tabs';
import type { TabId } from '@/shared/tabs';
import { COPY } from '@/shared/constants';

// Routing: a single SPA serving both the dashboard and the admin form.
// The admin form is reachable via ?admin=1; the dashboard is the default.
// (Vue Router would be overkill for two routes with no history needs.)
const isAdminRoute = computed(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('admin') === '1';
});

const { settings, load: loadSettings } = useAdminSettings();
const { status: gateStatus, check: runGate } = useAccessGate();
const { status: beitraegeStatus, check: runBeitraegeGate } = useAccessGate();
const ready = ref(false);

// Active tab (ADR-007). Kept in the URL so views can be linked and the
// browser's back button behaves; popstate keeps the ref in sync.
const activeTab = ref<TabId>(readTabFromUrl());

function syncTabFromUrl() {
    activeTab.value = readTabFromUrl();
}

function selectTab(tab: TabId) {
    if (tab === activeTab.value) return;
    activeTab.value = tab;
    writeTabToUrl(tab);
}

// Access rule for both views (ADR-008). ?admin=1 used to return early here,
// skipping loadSettings() and the gate entirely — anyone who knew the URL
// reached the group picker and could overwrite the configuration. The admin
// form is now gated like the dashboard; the only ungated path is the
// first-run case below, where there is no configured group to check against.
const organigramRule = computed(() => membershipRule(settings.value?.gateGroupId));

// The Beitragsabrechnung needs a role, not just membership: its export carries
// names, dates of birth and addresses for the whole Stamm, which the Teilstamm
// leaders in the same group have no need for. Unconfigured roles yield a null
// rule, and the tab stays unavailable (ADR-008).
const beitraegeRule = computed(() =>
    roleRule(settings.value?.gateGroupId, settings.value?.beitraegeRoleIds),
);

const beitraegeAllowed = computed(() => beitraegeStatus.value.phase === 'allowed');

/**
 * `idle` means the gate never ran — no rule configured, or the outer gate
 * already refused. `config-missing` means the roles are unset. Both mean the
 * view is unavailable, and Gate.vue renders nothing for either, so they are
 * normalized to a plain denial rather than an empty page.
 */
const beitraegeGateStatus = computed<AccessStatus>(() => {
    const phase = beitraegeStatus.value.phase;
    return phase === 'idle' || phase === 'config-missing'
        ? { phase: 'denied' }
        : beitraegeStatus.value;
});

/**
 * The feature is deployed but released to nobody. Worth saying out loud,
 * because the tab bar hides itself at a single tab and the view would
 * otherwise be invisible with no hint that it exists.
 */
const beitraegeUnconfigured = computed(
    () => !settings.value?.beitraegeRoleIds || settings.value.beitraegeRoleIds.length === 0,
);

const availableTabs = computed(() => {
    const tabs: { id: TabId; label: string }[] = [{ id: 'organigram', label: COPY.tabOrganigram }];
    if (beitraegeAllowed.value) tabs.push({ id: 'beitraege', label: COPY.tabBeitraege });
    return tabs;
});

onMounted(async () => {
    window.addEventListener('popstate', syncTabFromUrl);
    await loadSettings();
    await runGate(organigramRule.value);
    // Only worth asking once the user is through the outer gate, and only
    // when a rule exists — otherwise it is one wasted request per load.
    if (gateStatus.value.phase === 'allowed' && beitraegeRule.value) {
        await runBeitraegeGate(beitraegeRule.value);
    }
    ready.value = true;
});

onUnmounted(() => {
    window.removeEventListener('popstate', syncTabFromUrl);
});

// First-run: when nothing is configured yet, the App renders <Admin> directly
// instead of pointing the user to ?admin=1. After a successful save, re-run
// the gate so the dashboard appears without a manual reload.
async function handleSaved() {
    await loadSettings();
    await runGate(organigramRule.value);
    if (gateStatus.value.phase === 'allowed' && beitraegeRule.value) {
        await runBeitraegeGate(beitraegeRule.value);
    }
}
</script>

<template>
    <main v-if="!ready" class="rr-shell">
        <h1 class="rr-shell__title">{{ COPY.appTitle }}</h1>
        <p class="rr-shell__subtitle">{{ COPY.loading }}</p>
    </main>
    <Admin
        v-else-if="
            gateStatus.phase === 'config-missing' ||
            (isAdminRoute && gateStatus.phase === 'allowed')
        "
        :first-run="!isAdminRoute && gateStatus.phase === 'config-missing'"
        @saved="handleSaved"
    />
    <template
        v-else-if="
            gateStatus.phase === 'allowed' && settings && typeof settings.gateGroupId === 'number'
        "
    >
        <TabBar :tabs="availableTabs" :active="activeTab" @select="selectTab" />
        <SetupHint v-if="beitraegeUnconfigured && activeTab === 'organigram'" />
        <Dashboard
            v-if="activeTab === 'organigram'"
            :person="gateStatus.person"
            :gate-group-id="settings.gateGroupId"
            :teilstamm-ids="settings.teilstammIds"
        />
        <!--
          A typed ?tab=beitraege is denied, not quietly redirected to the
          organigram: the user asked for this view and deserves to be told
          they may not have it (ADR-008).
        -->
        <Beitraege v-else-if="beitraegeAllowed" />
        <Gate v-else :status="beitraegeGateStatus" :denied-message="COPY.beitraegeAccessDenied" />
    </template>
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
