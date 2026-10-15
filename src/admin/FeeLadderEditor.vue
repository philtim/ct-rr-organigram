<script setup lang="ts">
import { nextTick, ref, useId } from 'vue';
import EuroInput from './EuroInput.vue';
import { rungLabel } from './scope';
import { COPY } from '@/shared/copy';
import type { FeeConfig } from '@/shared/settings';

/**
 * The fee ladder per child, plus the two staff rates. The last rung applies
 * to every further child, so "free from the third" is three rungs, the last
 * at 0,00 € — no special case needed.
 *
 * Only the last rung can be removed, from its own row: taking one out of the
 * middle would shift every rung below it. The last remaining rung cannot be
 * removed at all — no ladder switches the Beitragsabrechnung off, which is
 * too much to happen by one stray click.
 */
const fees = defineModel<FeeConfig>({ required: true });

const id = useId();
const rungId = (index: number) => `${id}-rung-${index}`;
const ladder = ref<HTMLElement | null>(null);
/** What a screen reader hears after a removal — the new last row's label. */
const announcement = ref('');

function setRung(index: number, cents: number) {
    const childCents = [...fees.value.childCents];
    childCents[index] = cents;
    fees.value = { ...fees.value, childCents };
}

function addRung() {
    const rungs = fees.value.childCents;
    fees.value = { ...fees.value, childCents: [...rungs, rungs.at(-1) ?? 0] };
}

async function removeLastRung() {
    const childCents = fees.value.childCents.slice(0, -1);
    fees.value = { ...fees.value, childCents };
    const last = childCents.length - 1;
    // Cleared first, so a second removal with the same text is read out again.
    announcement.value = '';
    await nextTick();
    announcement.value = COPY.adminRungRemoved(rungLabel(last, childCents.length));
    // The button that had focus is gone; hand it to the row that is now last.
    ladder.value?.querySelector<HTMLInputElement>(`#${CSS.escape(rungId(last))}`)?.focus();
}

function setRate(key: 'staffCents' | 'juniorLeaderCents', cents: number) {
    fees.value = { ...fees.value, [key]: cents };
}
</script>

<template>
    <div ref="ladder">
        <div v-for="(cents, index) in fees.childCents" :key="index" class="fees__row">
            <label class="fees__label" :for="rungId(index)">
                {{ rungLabel(index, fees.childCents.length) }}
            </label>
            <EuroInput
                :id="rungId(index)"
                :model-value="cents"
                @update:model-value="setRung(index, $event)"
            />
            <span class="fees__unit">€</span>
            <button
                v-if="index === fees.childCents.length - 1 && fees.childCents.length > 1"
                type="button"
                class="fees__remove"
                :aria-label="COPY.adminRemoveRung(rungLabel(index, fees.childCents.length))"
                :title="COPY.adminRemoveRung(rungLabel(index, fees.childCents.length))"
                @click="removeLastRung"
            >
                <span aria-hidden="true">✕</span>
            </button>
        </div>
    </div>
    <p v-if="!fees.childCents.length" class="fees__empty">{{ COPY.adminNoLadder }}</p>
    <p class="fees__live" aria-live="polite">{{ announcement }}</p>
    <div class="fees__actions">
        <button type="button" class="fees__button" @click="addRung">
            {{ COPY.adminAddRung }}
        </button>
    </div>

    <p class="fees__heading">{{ COPY.adminStaffFeesHeading }}</p>
    <div class="fees__row">
        <label class="fees__label" :for="`${id}-staff`">{{ COPY.adminStaffFee }}</label>
        <EuroInput
            :id="`${id}-staff`"
            :model-value="fees.staffCents"
            @update:model-value="setRate('staffCents', $event)"
        />
        <span class="fees__unit">€</span>
    </div>
    <div class="fees__row">
        <label class="fees__label" :for="`${id}-junior`">{{ COPY.adminJuniorLeaderFee }}</label>
        <EuroInput
            :id="`${id}-junior`"
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
.fees__remove {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: 0.5px solid transparent;
    border-radius: var(--rr-radius-md);
    font: inherit;
    font-size: 13px;
    color: var(--rr-text-secondary);
    cursor: pointer;
}
.fees__remove:hover {
    background: var(--rr-bg-hover-on-white);
    border-color: var(--rr-border-secondary);
    color: var(--rr-text-primary);
}
.fees__remove:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 1px;
}
.fees__heading {
    margin: 14px 0 6px;
    font-size: 13px;
    font-weight: 500;
}
/* Read out, not shown: the change is visible in the rows themselves. */
.fees__live {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}

@media (max-width: 767px) {
    .fees__label {
        flex-basis: 110px;
    }
}
</style>
