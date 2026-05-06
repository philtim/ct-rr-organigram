<script setup lang="ts">
import { computed } from 'vue';
import type { Leader, OrgNode } from '@/shared/types';
import { COPY } from '@/shared/constants';
import { getGroupFrontendUrl } from '@/shared/api';
import LeaderAvatar from './LeaderAvatar.vue';

const props = defineProps<{ node: OrgNode }>();

const isError = computed(() => Boolean(props.node.error));
const primary = computed(() => props.node.leaders.filter((l) => l.leaderClass === 'primary'));
const coLeaders = computed(() =>
    props.node.leaders.filter((l) => l.leaderClass === 'coLeader'),
);
const href = computed(() => getGroupFrontendUrl(props.node.groupId));

function namesOf(leaders: Leader[]): string {
    return leaders.map((l) => l.fullName).join(', ');
}
</script>

<template>
    <a
        class="hs-card"
        :href="href"
        :aria-label="`Zur ChurchTools-Gruppe von ${node.name} wechseln`"
    >
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
                                <LeaderAvatar :leader="l" />
                                {{ l.fullName }}
                            </span>
                        </div>
                        <p class="hs-card__group-text">{{ namesOf(primary) }}</p>
                    </div>
                    <div v-if="coLeaders.length" class="hs-card__group">
                        <p class="hs-card__label">{{ COPY.hauptstammCoLeader }}</p>
                        <div class="hs-card__pills">
                            <span
                                v-for="l in coLeaders"
                                :key="l.personId"
                                class="hs-card__pill"
                            >
                                <LeaderAvatar :leader="l" />
                                {{ l.fullName }}
                            </span>
                        </div>
                        <p class="hs-card__group-text">{{ namesOf(coLeaders) }}</p>
                    </div>
                    <p v-if="!primary.length && !coLeaders.length" class="hs-card__empty">
                        Keine Leiter eingetragen.
                    </p>
                </template>
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
                <div class="hs-card__stat-tile">
                    <p class="hs-card__stat-label">{{ COPY.gesamtStat }}</p>
                    <p class="hs-card__stat-value">
                        {{ isError ? '?' : node.leaderCount + node.memberCount }}
                    </p>
                </div>
            </div>
        </div>
    </a>
</template>

<style scoped>
.hs-card {
    display: block;
    background: var(--rr-bg-secondary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 20px 24px;
    color: inherit;
    text-decoration: none;
    transition:
        background-color var(--rr-dur-hover) var(--rr-ease-out),
        border-color var(--rr-dur-hover) var(--rr-ease-out),
        box-shadow var(--rr-dur-hover) var(--rr-ease-out),
        transform var(--rr-dur-hover) var(--rr-ease-out);
}
.hs-card:hover,
.hs-card:focus-visible {
    background: var(--rr-bg-hover-on-white);
    border-color: var(--rr-border-hover);
    box-shadow: var(--rr-shadow-sm);
    transform: translateY(-1px);
}
.hs-card:active {
    transform: translateY(0);
    box-shadow: none;
    background: var(--rr-bg-hover-on-grey);
    transition-duration: var(--rr-dur-press);
    transition-timing-function: var(--rr-ease-press);
}
.hs-card:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
    .hs-card {
        transition-duration: 0ms;
    }
    .hs-card:hover,
    .hs-card:focus-visible,
    .hs-card:active {
        transform: none;
    }
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
.hs-card__group-text {
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
    .hs-card__group {
        margin-bottom: 8px;
    }
    .hs-card__group-text {
        display: block;
        margin: 0;
        font-size: 12px;
        color: var(--rr-text-primary);
        line-height: 1.4;
    }
}
</style>
