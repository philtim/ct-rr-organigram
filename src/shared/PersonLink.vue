<script setup lang="ts">
import { COPY } from './copy';

/**
 * A person's name linking to their ChurchTools profile (ADR-013), in a new
 * tab: the lists that carry these links exist to be worked through in
 * ChurchTools while the dashboard stays open. Classes pass through to the
 * link, so each list keeps its own type style.
 */
defineProps<{ name: string; href: string }>();
</script>

<template>
    <a
        class="person-link"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="COPY.openPersonInNewTab(name)"
    >
        {{ name }}<span class="person-link__mark" aria-hidden="true"> ↗</span>
    </a>
</template>

<style scoped>
.person-link {
    color: inherit;
    text-decoration: none;
}
.person-link:hover {
    text-decoration: underline;
}
.person-link:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
    border-radius: 2px;
}
.person-link__mark {
    color: var(--rr-text-secondary);
    font-weight: 400;
}
</style>
