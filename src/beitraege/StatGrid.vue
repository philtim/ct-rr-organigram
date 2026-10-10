<script setup lang="ts">
/** A row of labelled figures. `sub` sets it apart as a breakdown of the row above. */
defineProps<{ stats: { label: string; value: number }[]; sub?: boolean }>();
</script>

<template>
    <dl class="stat-grid" :class="{ 'stat-grid--sub': sub }">
        <div v-for="stat in stats" :key="stat.label" class="stat-grid__stat">
            <dt class="stat-grid__label">{{ stat.label }}</dt>
            <dd class="stat-grid__value">{{ stat.value }}</dd>
        </div>
    </dl>
</template>

<style scoped>
.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    margin: 0;
}

.stat-grid--sub {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 0.5px solid var(--rr-border-tertiary);
}

.stat-grid__stat {
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
    padding: 0.75rem 0.875rem;
}

.stat-grid__label {
    font-size: 0.8125rem;
    color: var(--rr-text-secondary);
    margin: 0;
}

.stat-grid__value {
    font-size: 1.5rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    margin: 0.125rem 0 0;
}
</style>
