<script setup lang="ts">
import { computed } from 'vue';
import type { OrgNode } from '@/shared/types';
import TeamChip from './TeamChip.vue';
import { COPY } from '@/shared/constants';
import { getGroupFrontendUrl } from '@/shared/api';

const props = defineProps<{ node: OrgNode }>();

const isError = computed(() => Boolean(props.node.error));
const leaderText = computed(() => props.node.leaders.map((l) => l.fullName).join(', '));
const summary = computed(() => {
    if (isError.value) return 'Teams konnten nicht geladen werden';
    const teamWord = props.node.children.length === 1 ? 'Team' : 'Teams';
    const lead = leaderText.value || 'Keine Leiter eingetragen';
    return `${lead} · ${props.node.children.length} ${teamWord}`;
});
const href = computed(() => getGroupFrontendUrl(props.node.groupId));
</script>

<template>
    <article class="ts-card">
        <a
            class="ts-card__link"
            :href="href"
            :aria-label="`Zur ChurchTools-Gruppe von ${node.name} wechseln`"
        >
            <!-- Compact mobile row (hidden on tablet+) -->
            <div class="ts-card__compact-row">
                <span class="ts-card__compact-name">{{ node.name }}</span>
                <span class="ts-card__compact-counts">
                    <template v-if="isError">?L · ?M</template>
                    <template v-else>{{ node.leaderCount }}L · {{ node.memberCount }}M</template>
                </span>
            </div>
            <p class="ts-card__compact-summary">{{ summary }}</p>

            <!-- Full layout (hidden on mobile) -->
            <header class="ts-card__head">
                <p class="ts-card__subtitle">TEILSTAMM</p>
                <h3 class="ts-card__name">{{ node.name }}</h3>
            </header>

            <div class="ts-card__leiter-list">
                <span class="ts-card__label">{{ COPY.teilstammLeader }}</span>
                <template v-if="isError">
                    <span class="ts-card__leiter-name">?</span>
                </template>
                <template v-else>
                    <span
                        v-for="l in node.leaders"
                        :key="l.personId"
                        class="ts-card__leiter-name"
                    >
                        {{ l.fullName }}
                    </span>
                    <span v-if="!node.leaders.length" class="ts-card__empty">
                        Keine Leiter eingetragen.
                    </span>
                </template>
            </div>

            <div class="ts-card__stat-row">
                <div class="ts-card__stat">
                    <p class="ts-card__stat-label">{{ COPY.teamleiterStat }}</p>
                    <p class="ts-card__stat-value">
                        {{ isError ? '?' : node.leaderCount }}
                    </p>
                </div>
                <div class="ts-card__stat">
                    <p class="ts-card__stat-label">{{ COPY.mitgliederStat }}</p>
                    <p class="ts-card__stat-value">
                        {{ isError ? '?' : node.memberCount }}
                    </p>
                </div>
            </div>
        </a>

        <section class="ts-card__teams">
            <p class="ts-card__subtitle">TEAMS</p>
            <p v-if="isError" class="ts-card__empty">
                Teams konnten nicht geladen werden.
            </p>
            <template v-else>
                <TeamChip v-for="team in node.children" :key="team.groupId" :node="team" />
                <p v-if="!node.children.length" class="ts-card__empty">Keine Teams.</p>
            </template>
        </section>
    </article>
</template>

<style scoped>
.ts-card {
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.ts-card__link {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: inherit;
    text-decoration: none;
    border-radius: var(--rr-radius-md);
    transition:
        transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
        background-color 180ms ease,
        box-shadow 180ms ease;
}
.ts-card__link:hover,
.ts-card__link:focus-visible {
    background: var(--rr-bg-tertiary);
    transform: translateY(-1px);
    box-shadow: var(--rr-shadow-sm);
}
.ts-card__link:active {
    transform: translateY(0);
    box-shadow: none;
    transition-duration: 80ms;
}
.ts-card__link:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
    .ts-card__link,
    .ts-card__link:hover,
    .ts-card__link:focus-visible,
    .ts-card__link:active {
        transform: none;
        transition-duration: 0ms;
    }
}
.ts-card__head {
    display: contents;
}
.ts-card__subtitle {
    margin: 0 0 2px;
    font-size: 11px;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
}
.ts-card__name {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
}
.ts-card__leiter-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.ts-card__label {
    font-size: 12px;
    color: var(--rr-text-secondary);
}
.ts-card__leiter-name {
    font-size: 13px;
}
.ts-card__empty {
    margin: 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
    font-style: italic;
}
.ts-card__stat-row {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}
.ts-card__stat {
    flex: 1;
}
.ts-card__stat-label {
    margin: 0;
    font-size: 11px;
    color: var(--rr-text-secondary);
}
.ts-card__stat-value {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
}
.ts-card__teams {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 8px;
    border-top: 0.5px solid var(--rr-border-tertiary);
}

/* Compact row visible only on mobile */
.ts-card__compact-row,
.ts-card__compact-summary {
    display: none;
}

/*
 * Mobile: collapse the entire card to one name+counts row plus a
 * single-line summary. Hide the full leader list, stat row, and team
 * chips entirely.
 */
@media (max-width: 767px) {
    .ts-card {
        padding: 12px 14px;
        gap: 4px;
    }
    .ts-card__link {
        gap: 4px;
    }
    .ts-card__compact-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
    .ts-card__compact-name {
        font-size: 14px;
        font-weight: 500;
    }
    .ts-card__compact-counts {
        font-size: 11px;
        color: var(--rr-text-secondary);
        flex-shrink: 0;
    }
    .ts-card__compact-summary {
        display: block;
        margin: 0;
        font-size: 11px;
        color: var(--rr-text-secondary);
    }
    .ts-card__head,
    .ts-card__leiter-list,
    .ts-card__stat-row,
    .ts-card__teams {
        display: none;
    }
}
</style>
