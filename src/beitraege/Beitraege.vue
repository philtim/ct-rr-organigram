<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { formatEuro, useBeitraege } from './useBeitraege';
import { nextDueDate } from '@/shared/rr/dates';
import { COPY } from '@/shared/constants';

/**
 * Beitragsabrechnung — figures only (ADR-007).
 *
 * The scope boundary this view exists to hold: **aggregates on screen, person
 * detail only in the export.** No name, no address, no per-child amount is
 * rendered here, and none is available to render — `summarize()` is handed
 * fee assignments that carry no person fields, so the boundary is a type
 * signature rather than a promise (ADR-011).
 */
const props = defineProps<{
    gateGroupId: number;
    teilstammIds?: number[];
}>();

const { state, exportState, load, exportXlsx } = useBeitraege();

onMounted(() => load(props.gateGroupId, props.teilstammIds ?? []));

const dateFormat = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

/** The date the file is about, named before the download rather than after. */
const dueDateLabel = computed(() =>
    new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeZone: 'UTC' }).format(
        nextDueDate(new Date()),
    ),
);
</script>

<template>
    <main class="rr-fees">
        <div class="rr-fees__inner">
            <header class="rr-fees__header">
                <h1 class="rr-fees__title">{{ COPY.beitraegeTitle }}</h1>
                <p v-if="state.phase === 'ready'" class="rr-fees__subtitle">
                    {{ COPY.timestampPrefix }}{{ dateFormat.format(state.result.loadedAt) }} ·
                    {{ state.result.teamCount }} Teams
                </p>
                <p v-else-if="state.phase === 'loading'" class="rr-fees__subtitle">
                    {{ COPY.loading }}
                </p>
            </header>

            <section v-if="state.phase === 'error'" class="rr-fees__panel rr-fees__panel--error">
                <p class="rr-fees__message">{{ COPY.beitraegeLoadError }}</p>
                <p class="rr-fees__detail">{{ state.message }}</p>
            </section>

            <section v-else-if="state.phase !== 'ready'" class="rr-fees__panel">
                <p class="rr-fees__message">{{ COPY.loading }}</p>
            </section>

            <template v-else>
                <section class="rr-fees__panel rr-fees__panel--total">
                    <p class="rr-fees__total-label">{{ COPY.feesTotalLabel }}</p>
                    <p class="rr-fees__total">{{ formatEuro(state.result.totals.totalCents) }}</p>
                    <p class="rr-fees__total-note">
                        {{ state.result.totals.firstChildren }} ×
                        {{ formatEuro(state.result.config.firstChildCents) }} ·
                        {{ state.result.totals.secondChildren }} ×
                        {{ formatEuro(state.result.config.secondChildCents) }}
                    </p>
                </section>

                <section class="rr-fees__panel">
                    <h2 class="rr-fees__section-title">{{ COPY.feesOrganigramTitle }}</h2>
                    <dl class="rr-fees__grid">
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesLeaders }}</dt>
                            <dd class="rr-fees__stat-value">{{ state.result.leaders }}</dd>
                        </div>
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesMembers }}</dt>
                            <dd class="rr-fees__stat-value">{{ state.result.members }}</dd>
                        </div>
                    </dl>
                    <p class="rr-fees__detail">
                        {{
                            COPY.feesReconciliation(
                                state.result.members,
                                state.result.totals.exemptStaff,
                                state.result.totals.participants,
                            )
                        }}
                    </p>
                </section>

                <section class="rr-fees__panel">
                    <h2 class="rr-fees__section-title">{{ COPY.feesPeopleTitle }}</h2>
                    <dl class="rr-fees__grid">
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesParticipants }}</dt>
                            <dd class="rr-fees__stat-value">
                                {{ state.result.totals.participants }}
                            </dd>
                        </div>
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesLiable }}</dt>
                            <dd class="rr-fees__stat-value">{{ state.result.totals.liable }}</dd>
                        </div>
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesExempt }}</dt>
                            <dd class="rr-fees__stat-value">{{ state.result.totals.exempt }}</dd>
                        </div>
                    </dl>
                    <dl class="rr-fees__grid rr-fees__grid--sub">
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesExemptStaff }}</dt>
                            <dd class="rr-fees__stat-value">
                                {{ state.result.totals.exemptStaff }}
                            </dd>
                        </div>
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesExemptThirdChild }}</dt>
                            <dd class="rr-fees__stat-value">
                                {{ state.result.totals.exemptThirdChild }}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section class="rr-fees__panel">
                    <h2 class="rr-fees__section-title">{{ COPY.feesFamiliesTitle }}</h2>
                    <dl class="rr-fees__grid">
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesFamilies }}</dt>
                            <dd class="rr-fees__stat-value">{{ state.result.families }}</dd>
                        </div>
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesFamiliesThreePlus }}</dt>
                            <dd class="rr-fees__stat-value">
                                {{ state.result.totals.familiesWithThreeOrMore }}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section
                    v-if="state.result.quality.unmatchable > 0"
                    class="rr-fees__panel rr-fees__panel--warn"
                >
                    <h2 class="rr-fees__section-title">{{ COPY.feesQualityTitle }}</h2>
                    <p class="rr-fees__detail">
                        {{ COPY.feesQualityHint(state.result.quality.unmatchable) }}
                    </p>
                    <dl class="rr-fees__grid rr-fees__grid--sub">
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesMissingAddress }}</dt>
                            <dd class="rr-fees__stat-value">
                                {{ state.result.quality.missingAddress }}
                            </dd>
                        </div>
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesMissingRelationship }}</dt>
                            <dd class="rr-fees__stat-value">
                                {{ state.result.quality.withoutRelationship }}
                            </dd>
                        </div>
                        <div class="rr-fees__stat">
                            <dt class="rr-fees__stat-label">{{ COPY.feesMissingBirthday }}</dt>
                            <dd class="rr-fees__stat-value">
                                {{ state.result.quality.missingBirthday }}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section class="rr-fees__panel">
                    <h2 class="rr-fees__section-title">{{ COPY.feesExportTitle }}</h2>
                    <button
                        type="button"
                        class="rr-fees__button"
                        :disabled="exportState.phase === 'working'"
                        @click="exportXlsx"
                    >
                        {{
                            exportState.phase === 'working'
                                ? COPY.feesExportWorking
                                : COPY.feesExportButton
                        }}
                    </button>
                    <p class="rr-fees__detail">{{ COPY.feesExportHint(dueDateLabel) }}</p>
                    <p class="rr-fees__detail rr-fees__detail--muted">
                        {{ COPY.feesExportPrivacy }}
                    </p>
                    <p v-if="exportState.phase === 'error'" class="rr-fees__detail rr-fees__error">
                        {{ exportState.message }}
                    </p>
                </section>

                <p class="rr-fees__footnote">{{ COPY.beitraegeAggregatesOnly }}</p>
            </template>
        </div>
    </main>
</template>

<style scoped>
/*
 * Layout only — colour tokens come from the global .rr-dashboard-root
 * variables defined in App.vue (ADR-002).
 */
.rr-fees {
    background: var(--rr-bg-tertiary);
    color: var(--rr-text-primary);
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    min-height: 100vh;
}

.rr-fees__inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1.5rem;
}

.rr-fees__header {
    margin-bottom: 1.25rem;
}

.rr-fees__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
}

.rr-fees__subtitle {
    font-size: 0.875rem;
    color: var(--rr-text-secondary);
    margin: 0.25rem 0 0;
}

.rr-fees__panel {
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    background: var(--rr-bg-primary);
    box-shadow: var(--rr-shadow-sm);
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
}

.rr-fees__panel--total {
    text-align: center;
}

.rr-fees__panel--warn {
    border-color: var(--rr-error-border);
    background: var(--rr-error-bg);
}

.rr-fees__panel--error {
    border-color: var(--rr-error-border);
    background: var(--rr-error-bg);
    color: var(--rr-error-fg);
}

.rr-fees__total-label {
    margin: 0;
    font-size: 0.875rem;
    color: var(--rr-text-secondary);
}

.rr-fees__total {
    margin: 0.25rem 0 0;
    font-size: 2.5rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
}

.rr-fees__total-note {
    margin: 0.375rem 0 0;
    font-size: 0.875rem;
    color: var(--rr-text-secondary);
    font-variant-numeric: tabular-nums;
}

.rr-fees__section-title {
    margin: 0 0 0.875rem;
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--rr-text-secondary);
}

.rr-fees__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    margin: 0;
}

.rr-fees__grid--sub {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 0.5px solid var(--rr-border-tertiary);
}

.rr-fees__stat {
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
    padding: 0.75rem 0.875rem;
}

.rr-fees__stat-label {
    font-size: 0.8125rem;
    color: var(--rr-text-secondary);
    margin: 0;
}

.rr-fees__stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    margin: 0.125rem 0 0;
}

.rr-fees__message {
    margin: 0;
    line-height: 1.5;
}

.rr-fees__detail {
    margin: 0.375rem 0 0;
    font-size: 0.875rem;
    line-height: 1.5;
}

/* Same affordance as the admin form's primary button. */
.rr-fees__button {
    padding: 0.5rem 1rem;
    font-size: 0.95rem;
    font-weight: 500;
    border: 0.5px solid var(--rr-text-primary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-text-primary);
    color: var(--rr-bg-primary);
    cursor: pointer;
}

.rr-fees__button:disabled {
    opacity: 0.4;
    cursor: progress;
}

.rr-fees__detail--muted {
    color: var(--rr-text-secondary);
}

.rr-fees__error {
    color: var(--rr-error-fg);
}

.rr-fees__footnote {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--rr-text-secondary);
    line-height: 1.5;
}

@media (max-width: 767px) {
    .rr-fees__inner {
        padding: 1rem;
    }

    .rr-fees__total {
        font-size: 2rem;
    }
}
</style>
