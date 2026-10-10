<script setup lang="ts">
import EuroInput from './EuroInput.vue';
import { rungLabel } from './scope';
import { COPY } from '@/shared/constants';
import type { FeeConfig } from '@/shared/settings';

/**
 * The fee ladder per child, plus the two staff rates. The last rung applies
 * to every further child, so "free from the third" is three rungs, the last
 * at 0,00 € — no special case needed.
 */
const fees = defineModel<FeeConfig>({ required: true });

function setRung(index: number, cents: number) {
    const childCents = [...fees.value.childCents];
    childCents[index] = cents;
    fees.value = { ...fees.value, childCents };
}

function addRung() {
    const ladder = fees.value.childCents;
    fees.value = { ...fees.value, childCents: [...ladder, ladder.at(-1) ?? 0] };
}

function setRate(key: 'staffCents' | 'juniorLeaderCents', cents: number) {
    fees.value = { ...fees.value, [key]: cents };
}

function removeRung() {
    fees.value = { ...fees.value, childCents: fees.value.childCents.slice(0, -1) };
}
</script>

<template>
    <div v-for="(cents, index) in fees.childCents" :key="index" class="fees__row">
        <span class="fees__label">{{ rungLabel(index, fees.childCents.length) }}</span>
        <EuroInput :model-value="cents" @update:model-value="setRung(index, $event)" />
        <span class="fees__unit">€</span>
    </div>
    <p v-if="!fees.childCents.length" class="fees__empty">{{ COPY.adminNoLadder }}</p>
    <div class="fees__actions">
        <button type="button" class="fees__button" @click="addRung">
            {{ COPY.adminAddRung }}
        </button>
        <button
            v-if="fees.childCents.length"
            type="button"
            class="fees__button"
            @click="removeRung"
        >
            {{ COPY.adminRemoveRung }}
        </button>
    </div>

    <div class="fees__row">
        <span class="fees__label">{{ COPY.adminStaffFee }}</span>
        <EuroInput
            :model-value="fees.staffCents"
            @update:model-value="setRate('staffCents', $event)"
        />
        <span class="fees__unit">€</span>
    </div>
    <div class="fees__row">
        <span class="fees__label">{{ COPY.adminJuniorLeaderFee }}</span>
        <EuroInput
            :model-value="fees.juniorLeaderCents"
            @update:model-value="setRate('juniorLeaderCents', $event)"
        />
        <span class="fees__unit">€</span>
        <span class="fees__note">{{ COPY.adminJuniorLeaderNote }}</span>
    </div>
</template>

<style scoped>
.fees__row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}
.fees__label {
    flex: 0 0 150px;
    font-size: 13px;
}
.fees__unit,
.fees__note {
    font-size: 13px;
    color: var(--rr-text-secondary);
}
.fees__note {
    font-size: 12px;
}
.fees__empty {
    margin: 0;
    color: var(--rr-text-secondary);
    font-size: 0.875rem;
    font-style: italic;
}
.fees__actions {
    display: flex;
    gap: 8px;
    margin: 10px 0 4px;
}
.fees__button {
    appearance: none;
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    padding: 6px 12px;
    font: inherit;
    font-size: 12px;
    color: var(--rr-text-primary);
    cursor: pointer;
}
.fees__button:hover {
    background: var(--rr-bg-hover-on-white);
}

@media (max-width: 767px) {
    .fees__label {
        flex-basis: 110px;
    }
}
</style>
