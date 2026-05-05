<script setup lang="ts">
import { computed } from 'vue';
import type { OrgNode } from '@/shared/types';
import { COPY } from '@/shared/constants';

const props = defineProps<{ node: OrgNode }>();

const isError = computed(() => Boolean(props.node.error));
const primary = computed(() => props.node.leaders.filter((l) => l.leaderClass === 'primary'));
const coLeaders = computed(() =>
    props.node.leaders.filter((l) => l.leaderClass === 'coLeader'),
);
const allLeaderText = computed(() => props.node.leaders.map((l) => l.fullName).join(', '));
</script>

<template>
    <article class="hs-card">
        <p class="hs-card__subtitle">HAUPTSTAMM</p>
        <h2 class="hs-card__name">{{ node.name }}</h2>

        <div class="hs-card__body">
            <div class="hs-card__main">
                <p v-if="isError" class="hs-card__label">{{ COPY.hauptstammLeader }}</p>
                <p v-if="isError" class="hs-card__placeholder" aria-label="unbekannt">?</p>

                <template v-else>
                    <div v-if="primary.length" class="hs-card__group">
                        <p class="hs-card__label">{{ COPY.hauptstammLeader }}</p>
                        <div class="hs-card__pills">
                            <span
                                v-for="l in primary"
                                :key="l.personId"
                                class="hs-card__pill"
                            >
                                <span class="hs-card__avatar">{{ l.initials }}</span>
                                {{ l.fullName }}
                            </span>
                        </div>
                    </div>
                    <div v-if="coLeaders.length" class="hs-card__group">
                        <p class="hs-card__label">{{ COPY.hauptstammCoLeader }}</p>
                        <div class="hs-card__pills">
                            <span
                                v-for="l in coLeaders"
                                :key="l.personId"
                                class="hs-card__pill"
                            >
                                <span class="hs-card__avatar">{{ l.initials }}</span>
                                {{ l.fullName }}
                            </span>
                        </div>
                    </div>
                    <p v-if="!primary.length && !coLeaders.length" class="hs-card__empty">
                        Keine Leiter eingetragen.
                    </p>
                </template>

                <!-- Mobile-only comma-separated text (hidden on desktop) -->
                <p v-if="!isError && allLeaderText" class="hs-card__leaders-text">
                    {{ allLeaderText }}
                </p>
            </div>

            <div class="hs-card__stats">
                <div class="hs-card__stat-tile">
                    <p class="hs-card__stat-label">{{ COPY.leiterStat }}</p>
                    <p class="hs-card__stat-value">
                        {{ isError ? '?' : node.leaderCount }}
                    </p>
                </div>
                <div class="hs-card__stat-tile">
                    <p class="hs-card__stat-label">{{ COPY.mitgliederStat }}</p>
                    <p class="hs-card__stat-value">
                        {{ isError ? '?' : node.memberCount }}
                    </p>
                </div>
            </div>
        </div>
    </article>
</template>

<style scoped>
.hs-card {
    background: var(--rr-bg-secondary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 20px 24px;
}
.hs-card__subtitle {
    margin: 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
}
.hs-card__name {
    margin: 4px 0 12px;
    font-size: 18px;
    font-weight: 500;
}
.hs-card__body {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
}
.hs-card__main {
    flex: 1;
    min-width: 0;
}
.hs-card__group {
    margin-bottom: 12px;
}
.hs-card__group:last-of-type {
    margin-bottom: 0;
}
.hs-card__label {
    margin: 0 0 6px;
    font-size: 12px;
    color: var(--rr-text-secondary);
}
.hs-card__pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.hs-card__pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--rr-bg-primary);
    border-radius: var(--rr-radius-md);
    padding: 4px 10px;
    font-size: 13px;
}
.hs-card__avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--rr-accent-bg);
    color: var(--rr-accent-fg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 500;
}
.hs-card__empty {
    margin: 0;
    font-size: 13px;
    color: var(--rr-text-secondary);
    font-style: italic;
}
.hs-card__placeholder {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: var(--rr-text-secondary);
}
.hs-card__leaders-text {
    display: none;
}
.hs-card__stats {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
}
.hs-card__stat-tile {
    background: var(--rr-bg-primary);
    border-radius: var(--rr-radius-md);
    padding: 12px 16px;
    min-width: 88px;
}
.hs-card__stat-label {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--rr-text-secondary);
}
.hs-card__stat-value {
    margin: 0;
    font-size: 24px;
    font-weight: 500;
}

/*
 * Mobile: stat tiles stack above the leader text in a row, pills are
 * replaced by a comma-separated text line (smaller footprint).
 */
@media (max-width: 767px) {
    .hs-card {
        padding: 14px;
    }
    .hs-card__body {
        flex-direction: column-reverse;
        gap: 12px;
    }
    .hs-card__stats {
        width: 100%;
    }
    .hs-card__stat-tile {
        flex: 1;
        padding: 8px 12px;
        min-width: 0;
    }
    .hs-card__stat-label {
        font-size: 10px;
    }
    .hs-card__stat-value {
        font-size: 18px;
    }
    .hs-card__pills,
    .hs-card__placeholder {
        display: none;
    }
    .hs-card__leaders-text {
        display: block;
        margin: 0;
        font-size: 12px;
    }
}
</style>
