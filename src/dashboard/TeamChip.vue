<script setup lang="ts">
import type { OrgNode } from '@/shared/types';
import { computed } from 'vue';

const props = defineProps<{ node: OrgNode }>();

const leaderNames = computed(() => props.node.leaders.map((l) => l.fullName).join(', '));
</script>

<template>
    <div class="team-chip">
        <div class="team-chip__row">
            <span class="team-chip__name">{{ node.name }}</span>
            <span class="team-chip__counts">
                {{ node.leaderCount }}L · {{ node.memberCount }}M
            </span>
        </div>
        <span v-if="leaderNames" class="team-chip__leiter">{{ leaderNames }}</span>
    </div>
</template>

<style scoped>
.team-chip {
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
    padding: 8px 10px;
}
.team-chip__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 2px;
}
.team-chip__name {
    font-size: 13px;
    font-weight: 500;
}
.team-chip__counts {
    font-size: 12px;
    color: var(--rr-text-secondary);
    flex-shrink: 0;
}
.team-chip__leiter {
    display: block;
    font-size: 12px;
    color: var(--rr-text-secondary);
    line-height: 1.4;
}
</style>
