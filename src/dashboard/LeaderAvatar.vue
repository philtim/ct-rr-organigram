<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Leader } from '@/shared/types';

const props = defineProps<{ leader: Leader }>();

// Per-instance load failure flag — if the image URL fails (e.g. dev-mode
// CORS, deleted image, expired session), we silently fall back to the
// initials circle. The watch resets it when a different leader binds to
// the same component instance during list re-renders.
const failed = ref(false);
watch(
    () => props.leader.personId,
    () => {
        failed.value = false;
    },
);
</script>

<template>
    <span class="avatar">
        <img
            v-if="leader.imageUrl && !failed"
            :src="leader.imageUrl"
            :alt="leader.fullName"
            class="avatar__img"
            loading="lazy"
            decoding="async"
            @error="failed = true"
        />
        <span v-else class="avatar__initials">{{ leader.initials }}</span>
    </span>
</template>

<style scoped>
.avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--rr-accent-bg);
    color: var(--rr-accent-fg);
    overflow: hidden;
    flex-shrink: 0;
}
.avatar__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
.avatar__initials {
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
}
</style>
