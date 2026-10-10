<script setup lang="ts">
// US-4: one Teilstamm card's placeholder. Dashboard renders one per
// configured Teilstamm inside the real grid, so the loading state has the
// shape of this Stamm rather than of any particular one.
const TEAM_PLACEHOLDERS = 3;
</script>

<template>
    <article class="sk-card" aria-hidden="true">
        <div>
            <div class="sk sk--ts-subtitle"></div>
            <div class="sk sk--ts-name"></div>
        </div>
        <div class="sk-card__leiter">
            <div class="sk sk--label-mini"></div>
            <div class="sk sk--leader-name"></div>
            <div class="sk sk--leader-name sk--leader-name-short"></div>
        </div>
        <div class="sk-card__stat-row">
            <div v-for="i in 3" :key="i" class="sk-card__stat">
                <div class="sk sk--stat-mini-label"></div>
                <div class="sk sk--stat-mini-value"></div>
            </div>
        </div>
        <div class="sk-card__teams">
            <div class="sk sk--ts-subtitle sk--ts-subtitle-tight"></div>
            <div v-for="t in TEAM_PLACEHOLDERS" :key="t" class="sk-card__team">
                <div class="sk sk--chip-name"></div>
                <div class="sk sk--chip-leiter"></div>
            </div>
        </div>
    </article>
</template>

<style scoped>
.sk {
    background: var(--rr-border-tertiary);
    border-radius: 4px;
    opacity: 0.7;
    animation: sk-pulse 1.6s ease-in-out infinite;
}

@keyframes sk-pulse {
    0%,
    100% {
        opacity: 0.55;
    }
    50% {
        opacity: 0.85;
    }
}

@media (prefers-reduced-motion: reduce) {
    .sk {
        animation: none;
    }
}

.sk-card {
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.sk--ts-subtitle {
    width: 70px;
    height: 9px;
    margin-bottom: 6px;
}
.sk--ts-subtitle-tight {
    margin-bottom: 0;
}
.sk--ts-name {
    width: 90px;
    height: 15px;
}
.sk-card__leiter {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.sk--label-mini {
    width: 40px;
    height: 10px;
}
.sk--leader-name {
    width: 100px;
    height: 11px;
}
.sk--leader-name-short {
    width: 90px;
}
.sk-card__stat-row {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}
.sk-card__stat {
    flex: 1;
}
.sk--stat-mini-label {
    width: 32px;
    height: 9px;
    margin-bottom: 6px;
}
.sk--stat-mini-value {
    width: 28px;
    height: 17px;
}
.sk-card__teams {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 8px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}
.sk-card__team {
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
    padding: 8px 10px;
}
.sk--chip-name {
    width: 70%;
    height: 11px;
    margin-bottom: 6px;
}
.sk--chip-leiter {
    width: 65%;
    height: 10px;
}
</style>
