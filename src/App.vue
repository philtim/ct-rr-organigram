<script setup lang="ts">
// Top-level shell. The .rr-dashboard-root scope is applied on the
// mount element in index.html (so the very first DOM node is already
// scoped); this component owns the layout inside that scope.
</script>

<template>
    <div class="rr-dashboard">
        <header class="rr-dashboard__header">
            <h1 class="rr-dashboard__title">RR Mitarbeiter-Dashboard</h1>
            <p class="rr-dashboard__subtitle">Lädt …</p>
        </header>
    </div>
</template>

<style scoped>
.rr-dashboard {
    padding: 1.5rem;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1f2937;
}

.rr-dashboard__header {
    margin-bottom: 1rem;
}

.rr-dashboard__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}

.rr-dashboard__subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0.25rem 0 0;
}
</style>
