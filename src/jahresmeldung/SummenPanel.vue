<script setup lang="ts">
import { computed } from 'vue';
import type { Tally } from './tally';
import { COPY } from '@/shared/constants';

const props = defineProps<{ tally: Tally }>();
const emit = defineEmits<{ copy: [number] }>();

/**
 * The form's three closing lines. `entdecker` and `ohneEntdecker` are null
 * when no single Teilstamm could be recognised as the Entdecker one — the
 * heuristic fails visibly rather than quietly picking a row (see the Design
 * Spec). `stamm` is a plain headcount and always available.
 */
const rows = computed(() => [
    { label: COPY.jahresmeldungSumEntdecker, value: props.tally.summen.entdecker },
    { label: COPY.jahresmeldungSumOhneEntdecker, value: props.tally.summen.ohneEntdecker },
    { label: COPY.jahresmeldungSumStamm, value: props.tally.summen.stamm },
]);

const entdeckerUnknown = computed(() => props.tally.summen.entdecker === null);
</script>

<template>
    <section class="jm-sum" aria-labelledby="jm-sum-title">
        <h2 id="jm-sum-title" class="jm-sum__title">{{ COPY.jahresmeldungSummenTitle }}</h2>

        <dl class="jm-sum__list">
            <template v-for="row in rows" :key="row.label">
                <dt class="jm-sum__label">{{ row.label }}</dt>
                <dd class="jm-sum__value">
                    <!--
                      Any failed team makes every total untrustworthy, so the
                      summary lines go unknown with the Gesamt row rather than
                      reporting a plausible-looking shortfall.
                    -->
                    <span
                        v-if="tally.incomplete || row.value === null"
                        class="jm-sum__unknown"
                        :aria-label="
                            tally.incomplete
                                ? COPY.jahresmeldungUnknownCell
                                : COPY.jahresmeldungSumUnknown
                        "
                        >{{ tally.incomplete ? '?' : '—' }}</span
                    >
                    <button
                        v-else
                        type="button"
                        class="jm-sum__button"
                        @click="emit('copy', row.value)"
                    >
                        {{ row.value }}
                    </button>
                </dd>
            </template>
        </dl>

        <p v-if="entdeckerUnknown && !tally.incomplete" class="jm-sum__note">
            {{ COPY.jahresmeldungSumUnknown }}
        </p>
    </section>
</template>

<style scoped>
.jm-sum {
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px 20px;
}

.jm-sum__title {
    margin: 0 0 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.jm-sum__list {
    margin: 0;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    row-gap: 2px;
}

.jm-sum__label {
    font-size: 13px;
    color: var(--rr-text-secondary);
    padding: 6px 12px 6px 0;
    border-top: 0.5px solid var(--rr-border-tertiary);
}

.jm-sum__value {
    margin: 0;
    text-align: right;
    border-top: 0.5px solid var(--rr-border-tertiary);
    font-variant-numeric: tabular-nums;
}

.jm-sum__list > .jm-sum__label:first-of-type,
.jm-sum__list > .jm-sum__label:first-of-type + .jm-sum__value {
    border-top: 0;
}

.jm-sum__button {
    appearance: none;
    border: 0;
    background: none;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--rr-text-primary);
    padding: 6px 8px;
    cursor: pointer;
    border-radius: var(--rr-radius-md);
    transition: background var(--rr-dur-hover) var(--rr-ease-out);
}

.jm-sum__button:hover {
    background: var(--rr-bg-hover-on-white);
}

.jm-sum__button:focus-visible {
    outline: 2px solid var(--rr-text-primary);
    outline-offset: -2px;
}

.jm-sum__unknown {
    display: inline-block;
    padding: 6px 8px;
    font-size: 15px;
    color: var(--rr-text-secondary);
}

.jm-sum__note {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
}

@media (max-width: 767px) {
    .jm-sum {
        padding: 14px;
    }
}
</style>
