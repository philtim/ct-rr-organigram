<script setup lang="ts">
import { fromEuro, toEuro } from './scope';

/**
 * Euro in the input, cents in the model — the arithmetic stays exact.
 *
 * A text field with a decimal keypad rather than `type="number"`: a number
 * input shows "0.00" with a point and spinner arrows that step by one cent,
 * neither of which belongs in a German money field. Comma and point are both
 * accepted.
 *
 * Commits on `change`, not on `input`. Re-formatting on every keystroke
 * rewrites the field under the typist: entering "80" produced "8.00",
 * because the first digit was reformatted and the cursor moved before the
 * second arrived.
 */
const cents = defineModel<number>({ required: true });

function commit(event: Event) {
    const input = event.target as HTMLInputElement;
    cents.value = fromEuro(input.value);
    // An unchanged model would leave "abc" standing in the field.
    input.value = toEuro(cents.value);
}
</script>

<template>
    <input
        class="euro-input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :value="toEuro(cents)"
        @change="commit"
    />
</template>

<style scoped>
.euro-input {
    width: 110px;
    padding: 6px 8px;
    font: inherit;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--rr-text-primary);
    background: var(--rr-bg-primary);
    border: 1px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
}
.euro-input:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 1px;
}
</style>
