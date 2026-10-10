<script setup lang="ts">
import { COPY } from '@/shared/copy';
import { computed } from 'vue';
import type { OrgNode } from './types';
import {
    findDuplicateLeaders,
    findDuplicateMembers,
    findMixedAssignments,
    findPeopleWithoutTeam,
} from './duplicates';

const props = defineProps<{ root: OrgNode }>();

const leaders = computed(() => findDuplicateLeaders(props.root));
const members = computed(() => findDuplicateMembers(props.root));
const mixed = computed(() => findMixedAssignments(props.root));
const withoutTeam = computed(() => findPeopleWithoutTeam(props.root));
const hasDuplicates = computed(
    () => leaders.value.length > 0 || members.value.length > 0 || mixed.value.length > 0,
);
const hasAny = computed(
    () =>
        hasDuplicates.value ||
        withoutTeam.value.staff.length > 0 ||
        withoutTeam.value.leadership.length > 0,
);
</script>

<template>
    <section class="dup">
        <h2 class="dup__title">{{ COPY.hintsTitle }}</h2>

        <p v-if="!hasAny" class="dup__empty">{{ COPY.hintsNone }}</p>

        <p v-if="hasDuplicates" class="dup__rule">{{ COPY.hintsRule }}</p>

        <div v-if="hasAny" class="dup__groups">
            <article v-if="leaders.length" class="dup__group">
                <h3 class="dup__group-title">{{ COPY.hintsLeadersInTeams }}</h3>
                <ul class="dup__list">
                    <li v-for="e in leaders" :key="e.personId" class="dup__item">
                        <span class="dup__name">{{ e.fullName }}</span>
                        <span class="dup__teams">{{ e.teamNames.join(', ') }}</span>
                    </li>
                </ul>
            </article>

            <article v-if="members.length" class="dup__group">
                <h3 class="dup__group-title">{{ COPY.hintsMembersInTeams }}</h3>
                <ul class="dup__list">
                    <li v-for="e in members" :key="e.personId" class="dup__item">
                        <span class="dup__name">{{ e.fullName }}</span>
                        <span class="dup__teams">{{ e.teamNames.join(', ') }}</span>
                    </li>
                </ul>
            </article>

            <article v-if="mixed.length" class="dup__group">
                <h3 class="dup__group-title">{{ COPY.hintsMixed }}</h3>
                <ul class="dup__list">
                    <li v-for="e in mixed" :key="e.personId" class="dup__item">
                        <span class="dup__name">{{ e.fullName }}</span>
                        <span class="dup__teams">{{ COPY.hintsMixedLeader(e.leaderTeams) }}</span>
                        <span class="dup__teams">{{
                            COPY.hintsMixedParticipant(e.participantTeams)
                        }}</span>
                    </li>
                </ul>
            </article>

            <article v-if="withoutTeam.staff.length" class="dup__group">
                <h3 class="dup__group-title">{{ COPY.hintsStaffWithoutTeam }}</h3>
                <ul class="dup__list">
                    <li v-for="e in withoutTeam.staff" :key="e.personId" class="dup__item">
                        <span class="dup__name">{{ e.fullName }}</span>
                        <span class="dup__teams">{{ e.teilstammNames.join(', ') }}</span>
                    </li>
                </ul>
            </article>

            <article v-if="withoutTeam.leadership.length" class="dup__group">
                <h3 class="dup__group-title">{{ COPY.hintsLeadershipWithoutTeam }}</h3>
                <ul class="dup__list">
                    <li v-for="e in withoutTeam.leadership" :key="e.personId" class="dup__item">
                        <span class="dup__name">{{ e.fullName }}</span>
                        <span class="dup__teams">{{ e.teilstammNames.join(', ') }}</span>
                    </li>
                </ul>
            </article>
        </div>
    </section>
</template>

<style scoped>
.dup {
    margin-top: 24px;
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px 20px;
}

.dup__title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
}

.dup__empty {
    margin: 0;
    font-size: 13px;
    color: var(--rr-text-secondary);
    font-style: italic;
}

.dup__rule {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--rr-text-secondary);
}

.dup__groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

.dup__group {
    min-width: 0;
}

.dup__group-title {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.dup__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.dup__item {
    flex: 1 1 200px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
}

.dup__name {
    font-size: 13px;
    font-weight: 500;
}

.dup__teams {
    font-size: 12px;
    color: var(--rr-text-secondary);
}

@media (max-width: 767px) {
    .dup {
        margin-top: 16px;
        padding: 14px;
    }
    .dup__groups {
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
    }
}
</style>
