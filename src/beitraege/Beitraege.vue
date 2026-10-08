<script setup lang="ts">
import { COPY } from '@/shared/constants';

/**
 * Beitragsabrechnung — scaffold only (ADR-007).
 *
 * The figures and the .xlsx export arrive in later steps. This view exists
 * now so tab routing and the role rule that guards it can be verified before
 * any domain logic depends on them.
 *
 * Scope boundary worth keeping in sight while filling this in: the view shows
 * aggregates only. Names, dates of birth, addresses and per-child amounts
 * belong in the export, never on screen. `src/shared/rr/` will hand this
 * component fee assignments without person fields, so the boundary holds by
 * type signature rather than by care.
 */
</script>

<template>
    <main class="rr-beitraege">
        <header class="rr-beitraege__header">
            <h1 class="rr-beitraege__title">{{ COPY.beitraegeTitle }}</h1>
        </header>

        <section class="rr-beitraege__panel">
            <p class="rr-beitraege__message">{{ COPY.beitraegePlaceholder }}</p>
        </section>
    </main>
</template>

<style scoped>
.rr-beitraege {
    background: var(--rr-bg-tertiary);
    color: var(--rr-text-primary);
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    min-height: 100vh;
    padding: 1.5rem;
}

.rr-beitraege__header {
    margin-bottom: 1.25rem;
}

.rr-beitraege__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
}

.rr-beitraege__panel {
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    background: var(--rr-bg-primary);
    padding: 1.25rem 1.5rem;
    box-shadow: var(--rr-shadow-sm);
}

.rr-beitraege__message {
    margin: 0;
    line-height: 1.5;
    color: var(--rr-text-secondary);
}

@media (max-width: 767px) {
    .rr-beitraege {
        padding: 1rem;
    }
}
</style>
