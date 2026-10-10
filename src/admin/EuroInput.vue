<script setup lang="ts">
import { fromEuro, toEuro } from './scope';

/**
 * Euro in the input, cents in the model — the arithmetic stays exact.
 *
 * Commits on `change`, not on `input`. Re-formatting on every keystroke
 * rewrites the field under the typist: entering "80" produced "8.00",
 * because the first digit was reformatted and the cursor moved before the
 * second arrived.
 */
const cents = defineModel<number>({ required: true });
</script>

<template>
    <input
        class="euro-input"
        type="number"
        min="0"
        step="0.01"
        :value="toEuro(cents)"
        @change="cents = fromEuro(($event.target as HTMLInputElement).value)"
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
</style>
