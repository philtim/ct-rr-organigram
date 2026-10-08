<script setup lang="ts">
import { computed } from 'vue';
import { COPY } from '@/shared/constants';

/**
 * Tells whoever can act on it that the Beitragsabrechnung exists but is not
 * released to any role yet, and therefore hidden from everybody (ADR-008
 * fails closed on an empty role list).
 *
 * Without this, deploying the feature looks exactly like not deploying it:
 * the tab bar renders nothing for a single tab, so the first version shipped
 * a view that nobody could discover and nothing pointed at.
 *
 * Shown to everyone who passes the gate, because everyone who passes the gate
 * can open the admin form and fix it. Should an admin-specific access rule
 * ever exist, this hint belongs behind that rule instead.
 *
 * No dismiss button on purpose. The hint is self-limiting — it disappears the
 * moment a role is picked — and a dismissal could not be remembered anyway:
 * browser storage is off-limits in this project, so it would reappear on the
 * next reload and merely imply a persistence it does not have.
 */
const adminHref = computed(() => {
    if (typeof window === 'undefined') return '?admin=1';
    const url = new URL(window.location.href);
    url.searchParams.set('admin', '1');
    url.searchParams.delete('tab');
    return `${url.pathname}${url.search}`;
});
</script>

<template>
    <aside class="rr-setup-hint">
        <p class="rr-setup-hint__text">
            {{ COPY.beitraegeSetupHint }}
            <a class="rr-setup-hint__link" :href="adminHref">{{ COPY.beitraegeSetupHintLink }}</a>
        </p>
    </aside>
</template>

<style scoped>
/*
 * Sits in the same full-width band as the tab bar, so it reads as part of
 * the shell rather than as content of the view below it.
 */
.rr-setup-hint {
    background: var(--rr-accent-bg);
    color: var(--rr-accent-fg);
    border-bottom: 0.5px solid var(--rr-border-tertiary);
    padding: 0.625rem 1.5rem;
}

.rr-setup-hint__text {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
}

.rr-setup-hint__link {
    color: inherit;
    font-weight: 600;
    text-decoration: underline;
    white-space: nowrap;
}

.rr-setup-hint__link:hover {
    text-decoration: none;
}

@media (max-width: 767px) {
    .rr-setup-hint {
        padding: 0.625rem 1rem;
    }
}
</style>
