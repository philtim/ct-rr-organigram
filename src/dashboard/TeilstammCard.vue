<script setup lang="ts">
import { computed } from 'vue';
import type { OrgNode } from '@/shared/types';
import TeamChip from './TeamChip.vue';
import { COPY } from '@/shared/constants';
import { getGroupFrontendUrl } from '@/shared/api';
import { leaderRoleRows } from './counts';

const props = defineProps<{
    node: OrgNode;
    alwaysShownRoleIds: number[];
    /**
     * A small Stamm names the same group as Hauptstamm and as its only
     * Teilstamm. The hero card above already carries the name, the leaders
     * and the figures, so this card drops to its teams — which live nowhere
     * else and would otherwise simply not be shown.
     */
    teamsOnly?: boolean;
    /** The configured member field, or '' when the Stamm keeps none. */
    memberFieldName: string;
}>();

const isError = computed(() => Boolean(props.node.error));
// One row per leadership role, in the group type's own order. Stammleiter and
// Stammwart stay visible when vacant (Settings.alwaysShownRoleIds) so an
// open position is readable as such; an unfilled Stammhelfer is simply absent.
const roleGroups = computed(() =>
    leaderRoleRows(props.node.leaderRoles, props.node.leaders, (roleId) =>
        props.alwaysShownRoleIds.includes(roleId),
    ),
);
// The compact mobile row has no space for role labels, so names go flat there.
const leaderText = computed(() =>
    roleGroups.value
        .flatMap((g) => g.leaders)
        .map((l) => l.fullName)
        .join(', '),
);
const summary = computed(() => {
    if (isError.value) return 'Teams konnten nicht geladen werden';
    const teamWord = props.node.children.length === 1 ? 'Team' : 'Teams';
    const lead = leaderText.value || 'Keine Leiter eingetragen';
    return `${lead} · ${props.node.children.length} ${teamWord}`;
});
const href = computed(() => getGroupFrontendUrl(props.node.groupId));
// Written-out counts for the mobile compact view — Variante-C style,
// consistent with TeamChip: divider above, Leiter + Teilnehmer on one
// line, the configured member field on its own line when there is one.
const compactCounts = computed(() => {
    if (isError.value) return '? Leiter · ? Teilnehmer';
    return `${props.node.leaderCount} Leiter · ${props.node.memberCount} Teilnehmer`;
});
const compactField = computed(() =>
    props.memberFieldName
        ? `${isError.value ? '?' : props.node.horizontCount}× ${props.memberFieldName}`
        : null,
);
</script>

<template>
    <article class="ts-card">
        <a
            class="ts-card__link"
            :href="href"
            :aria-label="`Zur ChurchTools-Gruppe von ${node.name} wechseln`"
        >
            <!-- Compact mobile row (hidden on tablet+) -->
            <div v-if="!props.teamsOnly" class="ts-card__compact-row">
                <span class="ts-card__compact-name">{{ node.name }}</span>
            </div>
            <p v-if="!props.teamsOnly" class="ts-card__compact-summary">{{ summary }}</p>
            <div v-if="!props.teamsOnly" class="ts-card__compact-meta">
                <span class="ts-card__compact-meta-line">{{ compactCounts }}</span>
                <span v-if="compactField" class="ts-card__compact-meta-line">
                    {{ compactField }}
                </span>
            </div>

            <!-- Full layout (hidden on mobile) -->
            <header v-if="!props.teamsOnly" class="ts-card__head">
                <p class="ts-card__subtitle">TEILSTAMM</p>
                <h3 class="ts-card__name">{{ node.name }}</h3>
            </header>

            <div v-if="!props.teamsOnly" class="ts-card__leiter-list">
                <template v-if="isError">
                    <span class="ts-card__label">{{ COPY.leiterStat }}</span>
                    <span class="ts-card__leiter-name">?</span>
                </template>
                <template v-else>
                    <template v-for="g in roleGroups" :key="g.role">
                        <span class="ts-card__label">{{ g.role }}</span>
                        <span v-for="l in g.leaders" :key="l.personId" class="ts-card__leiter-name">
                            {{ l.fullName }}
                        </span>
                        <span v-if="!g.leaders.length" class="ts-card__vacant">
                            {{ COPY.vacantRole }}
                        </span>
                    </template>
                    <span v-if="!roleGroups.length" class="ts-card__empty">
                        Keine Leiter eingetragen.
                    </span>
                </template>
            </div>

            <div v-if="!props.teamsOnly" class="ts-card__stat-row">
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
                <div class="ts-card__stat">
                    <p class="ts-card__stat-label">{{ COPY.gesamtStat }}</p>
                    <p class="ts-card__stat-value">
                        {{ isError ? '?' : node.leaderCount + node.memberCount }}
                    </p>
                </div>
            </div>

            <div v-if="props.memberFieldName" class="ts-card__horizont-row">
                <div class="ts-card__stat">
                    <p class="ts-card__stat-label">{{ props.memberFieldName }}</p>
                    <p class="ts-card__stat-value">
                        {{ isError ? '?' : node.horizontCount }}
                    </p>
                </div>
            </div>
        </a>

        <section class="ts-card__teams">
            <p class="ts-card__subtitle">TEAMS</p>
            <p v-if="isError" class="ts-card__empty">Teams konnten nicht geladen werden.</p>
            <template v-else>
                <TeamChip
                    v-for="team in node.children"
                    :key="team.groupId"
                    :node="team"
                    :member-field-name="props.memberFieldName"
                />
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
    /* 8px outside + 8px inside link/teams = 16px to text, same as before, but
       the inner hover surface now sits inset from the card edge. */
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.ts-card__link {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px;
    color: inherit;
    text-decoration: none;
    border-radius: var(--rr-radius-md);
    transition:
        background-color var(--rr-dur-hover) var(--rr-ease-out),
        transform var(--rr-dur-hover) var(--rr-ease-out);
}
.ts-card__link:hover,
.ts-card__link:focus-visible {
    background: var(--rr-bg-hover-on-white);
    transform: translateY(-1px);
}
.ts-card__link:active {
    transform: translateY(0);
    background: var(--rr-bg-hover-on-grey);
    transition-duration: var(--rr-dur-press);
    transition-timing-function: var(--rr-ease-press);
}
.ts-card__link:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
    .ts-card__link {
        transition-duration: 0ms;
    }
    .ts-card__link:hover,
    .ts-card__link:focus-visible,
    .ts-card__link:active {
        transform: none;
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
.ts-card__vacant {
    font-size: 14px;
    color: var(--rr-text-secondary);
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
.ts-card__horizont-row {
    padding-top: 8px;
    border-top: 0.5px solid var(--rr-border-tertiary);
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
    padding: 8px 8px 0;
    border-top: 0.5px solid var(--rr-border-tertiary);
}

/* Compact row visible only on mobile */
.ts-card__compact-row,
.ts-card__compact-summary,
.ts-card__compact-meta {
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
        padding: 0;
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
    .ts-card__compact-summary {
        display: block;
        margin: 0;
        font-size: 11px;
        color: var(--rr-text-secondary);
    }
    .ts-card__compact-meta {
        display: block;
        margin-top: 2px;
        padding-top: 4px;
        border-top: 0.5px solid var(--rr-border-tertiary);
    }
    .ts-card__compact-meta-line {
        display: block;
        font-size: 11px;
        color: var(--rr-text-secondary);
    }
    .ts-card__head,
    .ts-card__leiter-list,
    .ts-card__stat-row,
    .ts-card__horizont-row,
    .ts-card__teams {
        display: none;
    }
}
</style>
