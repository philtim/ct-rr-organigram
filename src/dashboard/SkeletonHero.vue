<script setup lang="ts">
// US-4: the Hauptstamm card's placeholder while the organigram loads. Same
// outline as HauptstammCard, so nothing moves when the data arrives.
// Matches docs/screens/screen-2-skeleton.png.
</script>

<template>
    <article class="sk-hero" aria-hidden="true">
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
                <div v-for="i in 3" :key="i" class="sk-hero__stat">
                    <div class="sk sk--stat-label"></div>
                    <div class="sk sk--stat-value"></div>
                </div>
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

.sk-hero {
    background: var(--rr-bg-secondary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 20px 24px;
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
</style>
