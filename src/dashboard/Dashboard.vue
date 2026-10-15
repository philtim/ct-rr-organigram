<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CollectionCard from './CollectionCard.vue';
import DuplicatesPanel from './DuplicatesPanel.vue';
import HauptstammCard from './HauptstammCard.vue';
import SkeletonHero from './SkeletonHero.vue';
import SkeletonTeilstamm from './SkeletonTeilstamm.vue';
import TeilstammCard from './TeilstammCard.vue';
import { fieldSeenInTree } from './counts';
import { useBalancedColumns } from './useBalancedColumns';
import { useDashboard } from './useDashboard';
import ViewShell from '@/shared/ViewShell.vue';
import { formatTimestamp } from '@/shared/format';
import type { LoadFailure } from './rollup';
import { COPY } from '@/shared/copy';
import type { Settings } from '@/shared/settings';

const props = defineProps<{
    settings: Settings;
    /** The viewer may open the configuration — shows the link to it. */
    canConfigure?: boolean;
}>();

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
const collections = computed(() => loaded.value?.root.collections ?? []);

// Even rows of Teilstamm cards: six where five fit become 3 + 3.
const grid = ref<HTMLElement | null>(null);
const { columns } = useBalancedColumns(grid, () => teilstammIds.value.length);
const gridStyle = computed(() =>
    columns.value === null || teamsOnly.value
        ? undefined
        : { gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))` },
);

/**
 * The configured member field exists in no group that loaded — renamed or
 * deleted since the setup. The tiles would all read 0, which looks like an
 * answer. Not claimed while part of the tree is missing: the field may be on
 * exactly the groups that failed.
 */
const fieldMissing = computed(
    () =>
        Boolean(props.settings.horizontFieldName) &&
        loaded.value !== null &&
        !loaded.value.root.incomplete &&
        !fieldSeenInTree(loaded.value.root),
);

const status = computed(() =>
    state.value.phase === 'ready'
        ? COPY.loadedAt(formatTimestamp(state.value.loadedAt))
        : COPY.loading,
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
        case 'sammelgruppe':
            return COPY.failedSammelgruppe(failure.name);
    }
}

const appVersion = __APP_VERSION__;
const appCommit = __APP_COMMIT__;
</script>

<template>
    <ViewShell
        :title="COPY.appTitle"
        :status="status"
        refreshable
        :loading="state.phase === 'loading'"
        @refresh="load(settings)"
    >
        <p v-if="state.phase === 'error'" class="rr-dash__error" role="alert">
            {{ state.message }}
        </p>
        <p v-else-if="state.phase === 'unconfigured'" class="rr-dash__hint" role="alert">
            {{ state.message }}
        </p>

        <template v-else>
            <!--
              A warning that stays, not a toast that goes: the red "?" below
              reads as "missing" only for as long as somebody says what is.
            -->
            <section v-if="loaded?.failures.length" class="rr-dash__warning" role="alert">
                <p class="rr-dash__warning-title">{{ COPY.partialErrorTitle }}</p>
                <ul class="rr-dash__warning-list">
                    <li v-for="(f, i) in loaded.failures" :key="i">{{ describe(f) }}</li>
                </ul>
            </section>

            <p v-if="fieldMissing" class="rr-dash__hint" role="alert">
                {{ COPY.memberFieldMissing(settings.horizontFieldName) }}
            </p>

            <HauptstammCard v-if="loaded" :node="loaded.root" />
            <SkeletonHero v-else />
            <div class="rr-dash__divider" aria-hidden="true">│</div>
            <!--
              One grid for the placeholders and the cards, sized by the
              configured Teilstämme, so nothing moves when data arrives.
            -->
            <div
                ref="grid"
                class="rr-dash__grid"
                :class="{ 'rr-dash__grid--single': teamsOnly }"
                :style="gridStyle"
            >
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
            <!-- Sammelgruppen: not a level of the organigram, so their own section. -->
            <section v-if="collections.length" class="rr-dash__collections">
                <h2 class="rr-dash__section-title">{{ COPY.collectionsTitle }}</h2>
                <div class="rr-dash__collection-grid">
                    <CollectionCard v-for="c in collections" :key="c.groupId" :node="c" />
                </div>
            </section>
            <DuplicatesPanel v-if="loaded" :root="loaded.root" />
        </template>

        <footer class="rr-dash__footer">
            <a v-if="canConfigure" class="rr-dash__configure" href="?admin=1">
                {{ COPY.openConfiguration }}
            </a>
            <span :title="COPY.buildInfo(appVersion, appCommit)">
                v{{ appVersion }} · {{ appCommit }}
            </span>
        </footer>
    </ViewShell>
</template>

<style scoped>
/* Layout only; the frame is ViewShell's, the colour tokens App.vue's. */

.rr-dash__divider {
    text-align: center;
    color: var(--rr-border-secondary);
    margin: 0 0 16px;
    font-size: 18px;
    line-height: 1;
}

.rr-dash__grid {
    display: grid;
    /* As many columns as fit. useBalancedColumns refines this into even rows;
       without it, auto-fit still lays the cards out. No fixed count: that
       would describe one particular Stamm. */
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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

.rr-dash__hint {
    margin: 0;
    padding: 0.75rem 1rem;
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-md);
}

.rr-dash__error {
    margin-top: 1rem;
    color: var(--rr-error-fg);
    background: var(--rr-error-bg);
    border: 0.5px solid var(--rr-error-border);
    border-radius: var(--rr-radius-md);
    padding: 0.75rem 1rem;
}

.rr-dash__collections {
    margin-top: 24px;
}
.rr-dash__section-title {
    margin: 0 0 10px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--rr-text-secondary);
}
.rr-dash__collection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
    align-items: start;
}

.rr-dash__footer {
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: 16px;
    margin-top: 32px;
    font-size: 11px;
    color: var(--rr-text-secondary);
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}
.rr-dash__footer > span {
    opacity: 0.7;
}
.rr-dash__configure {
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px;
    color: var(--rr-text-secondary);
}
.rr-dash__configure:hover {
    color: var(--rr-text-primary);
}
.rr-dash__configure:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
}

/* Mobile: single-column stack, no inter-level divider. */
@media (max-width: 767px) {
    .rr-dash__grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
    }
    .rr-dash__divider {
        display: none;
    }
}
</style>
