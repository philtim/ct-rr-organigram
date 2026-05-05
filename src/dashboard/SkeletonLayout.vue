<script setup lang="ts">
// US-4: structural skeleton shown while the organigram data loads.
// Same shape as the rendered dashboard so the layout doesn't shift on
// transition. Matches docs/screens/screen-2-skeleton.png.
const TEILSTAMM_COUNT = 5;
const TEAM_PLACEHOLDERS = 3;
</script>

<template>
    <div>
        <article class="sk-hero">
            <div class="sk-hero__row">
                <div class="sk-hero__main">
                    <div class="sk sk--subtitle"></div>
                    <div class="sk sk--name"></div>
                    <div class="sk sk--label"></div>
                    <div class="sk-hero__pills">
                        <div class="sk sk--pill"></div>
                        <div class="sk sk--pill"></div>
                        <div class="sk sk--pill sk--pill-wide"></div>
                    </div>
                </div>
                <div class="sk-hero__stats">
                    <div class="sk-hero__stat">
                        <div class="sk sk--stat-label"></div>
                        <div class="sk sk--stat-value"></div>
                    </div>
                    <div class="sk-hero__stat">
                        <div class="sk sk--stat-label"></div>
                        <div class="sk sk--stat-value"></div>
                    </div>
                </div>
            </div>
        </article>

        <div class="rr-dash__divider" aria-hidden="true">│</div>

        <div class="rr-dash__grid">
            <article
                v-for="i in TEILSTAMM_COUNT"
                :key="i"
                class="sk-card"
            >
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
                    <div class="sk-card__stat">
                        <div class="sk sk--stat-mini-label"></div>
                        <div class="sk sk--stat-mini-value"></div>
                    </div>
                    <div class="sk-card__stat">
                        <div class="sk sk--stat-mini-label"></div>
                        <div class="sk sk--stat-mini-value"></div>
                    </div>
                </div>
                <div class="sk-card__teams">
                    <div class="sk sk--ts-subtitle sk--ts-subtitle-tight"></div>
                    <div
                        v-for="t in TEAM_PLACEHOLDERS"
                        :key="t"
                        class="sk-card__team"
                    >
                        <div class="sk sk--chip-name"></div>
                        <div class="sk sk--chip-leiter"></div>
                    </div>
                </div>
            </article>
        </div>
    </div>
</template>

<style scoped>
/*
 * Inheriting CSS variables from the parent .rr-dash scope (Dashboard.vue).
 * The block here defines layout & sizing only; colors are var()-driven.
 */
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

/* HAUPTSTAMM HERO SKELETON */

.sk-hero {
    background: var(--rr-bg-secondary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 20px 24px;
    margin-bottom: 24px;
}
.sk-hero__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
}
.sk-hero__main {
    flex: 1;
    min-width: 0;
}
.sk-hero__pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}
.sk--subtitle {
    width: 80px;
    height: 10px;
    margin-bottom: 8px;
}
.sk--name {
    width: 220px;
    height: 18px;
    margin-bottom: 16px;
}
.sk--label {
    width: 40px;
    height: 10px;
    margin-bottom: 8px;
}
.sk--pill {
    width: 110px;
    height: 26px;
    border-radius: 8px;
}
.sk--pill-wide {
    width: 130px;
}
.sk-hero__stats {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
}
.sk-hero__stat {
    background: var(--rr-bg-primary);
    border-radius: var(--rr-radius-md);
    padding: 12px 16px;
    min-width: 88px;
}
.sk--stat-label {
    width: 40px;
    height: 10px;
    margin-bottom: 8px;
}
.sk--stat-value {
    width: 32px;
    height: 22px;
}

/* TEILSTAMM CARD SKELETON */

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
