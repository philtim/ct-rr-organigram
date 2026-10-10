<script setup lang="ts">
import { computed, onMounted } from 'vue';
import DuplicatesPanel from './DuplicatesPanel.vue';
import HauptstammCard from './HauptstammCard.vue';
import SkeletonHero from './SkeletonHero.vue';
import SkeletonTeilstamm from './SkeletonTeilstamm.vue';
import TeilstammCard from './TeilstammCard.vue';
import { useDashboard } from './useDashboard';
import { formatTimestamp } from '@/shared/format';
import type { LoadFailure } from './rollup';
import { COPY } from '@/shared/constants';
import type { Settings } from '@/shared/settings';

const props = defineProps<{ settings: Settings }>();

const { state, load } = useDashboard();

onMounted(() => {
    load(props.settings);
});

/**
 * A small Stamm names the same group as Hauptstamm and as its only Teilstamm.
 * The hero card then already says everything the Teilstamm card would, so the
 * card below drops to its team chips, which live nowhere else.
 */
const teilstammIds = computed(() => [...new Set(props.settings.teilstammIds)]);
const teamsOnly = computed(
    () => teilstammIds.value.length === 1 && teilstammIds.value[0] === props.settings.gateGroupId,
);
const loaded = computed(() => (state.value.phase === 'ready' ? state.value : null));

const stand = computed(() =>
    state.value.phase === 'ready' ? formatTimestamp(state.value.loadedAt) : null,
);

function describe(failure: LoadFailure): string {
    switch (failure.kind) {
        case 'hauptstamm':
            return COPY.failedHauptstamm(failure.name);
        case 'teilstamm':
            return COPY.failedTeilstamm(failure.name);
        case 'teilstamm-teams':
            return COPY.failedTeilstammTeams(failure.name);
        case 'team':
            return COPY.failedTeam(failure.name, failure.teilstamm);
    }
}

const appVersion = __APP_VERSION__;
const appCommit = __APP_COMMIT__;
</script>

<template>
    <main class="rr-dash">
        <div class="rr-dash__inner">
            <header class="rr-dash__header">
                <div class="rr-dash__title-block">
                    <h1 class="rr-dash__title">{{ COPY.appTitle }}</h1>
                    <p class="rr-dash__subtitle">
                        <template v-if="stand"> {{ COPY.timestampPrefix }}{{ stand }} </template>
                        <template v-else>{{ COPY.loading }}</template>
                    </p>
                </div>
                <button
                    type="button"
                    class="rr-dash__refresh"
                    :disabled="state.phase === 'loading'"
                    @click="load(settings)"
                >
                    ↻ <span class="rr-dash__refresh-label">{{ COPY.refresh }}</span>
                </button>
            </header>

            <p v-if="state.phase === 'error'" class="rr-dash__error" role="alert">
                {{ state.message }}
            </p>

            <template v-else>
                <!--
                  A warning that stays, not a toast that goes: the red "?"
                  above reads as "missing" only for as long as somebody
                  says what is missing.
                -->
                <section v-if="loaded?.failures.length" class="rr-dash__warning" role="alert">
                    <p class="rr-dash__warning-title">{{ COPY.partialErrorTitle }}</p>
                    <ul class="rr-dash__warning-list">
                        <li v-for="(f, i) in loaded.failures" :key="i">{{ describe(f) }}</li>
                    </ul>
                </section>

                <HauptstammCard v-if="loaded" :node="loaded.root" />
                <SkeletonHero v-else />
                <div class="rr-dash__divider" aria-hidden="true">│</div>
                <!--
                  One grid for the placeholders and the cards, sized by the
                  configured Teilstämme, so nothing moves when data arrives.
                -->
                <div class="rr-dash__grid" :class="{ 'rr-dash__grid--single': teamsOnly }">
                    <template v-if="loaded">
                        <TeilstammCard
                            v-for="ts in loaded.root.children"
                            :key="ts.groupId"
                            :node="ts"
                            :always-shown-role-ids="settings.alwaysShownRoleIds"
                            :teams-only="teamsOnly"
                            :member-field-name="settings.horizontFieldName"
                        />
                    </template>
                    <template v-else>
                        <SkeletonTeilstamm v-for="id in teilstammIds" :key="id" />
                    </template>
                </div>
                <DuplicatesPanel v-if="loaded" :root="loaded.root" />
            </template>

            <footer
                class="rr-dash__footer"
                :title="`RR Organigram v${appVersion} (build ${appCommit})`"
            >
                v{{ appVersion }} · {{ appCommit }}
            </footer>
        </div>
    </main>
</template>

<style scoped>
/*
 * Layout-only here. Color tokens come from the global .rr-dashboard-root
 * variables defined in App.vue (light + dark via prefers-color-scheme).
 */
/*
 * Two-layer layout so the dark-mode background extends edge-to-edge of
 * the host viewport while the content stays centered + capped at 1280px.
 *   .rr-dash       — full-width band; carries background + min-height
 *   .rr-dash__inner — content column; max-width + padding
 */
.rr-dash {
    background: var(--rr-bg-tertiary);
    color: var(--rr-text-primary);
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    min-height: 100vh;
}
.rr-dash__inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px;
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
    /* As many columns as fit — five on a full desktop, fewer cards simply
       get wider. No fixed count: that would describe one particular Stamm. */
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    align-items: start;
}

/* A small Stamm has one card carrying only team chips. */
.rr-dash__grid--single {
    grid-template-columns: minmax(0, 1fr);
}

.rr-dash__warning {
    margin: 0 0 16px;
    color: var(--rr-error-fg);
    background: var(--rr-error-bg);
    border: 0.5px solid var(--rr-error-border);
    border-radius: var(--rr-radius-md);
    padding: 0.75rem 1rem;
}
.rr-dash__warning-title {
    margin: 0;
    font-weight: 500;
}
.rr-dash__warning-list {
    margin: 6px 0 0;
    padding-left: 1.25rem;
}

.rr-dash__error {
    margin-top: 1rem;
    color: var(--rr-error-fg);
    background: var(--rr-error-bg);
    border: 0.5px solid var(--rr-error-border);
    border-radius: var(--rr-radius-md);
    padding: 0.75rem 1rem;
}

.rr-dash__footer {
    margin-top: 32px;
    text-align: center;
    font-size: 11px;
    color: var(--rr-text-secondary);
    opacity: 0.7;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
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
    .rr-dash__inner {
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
