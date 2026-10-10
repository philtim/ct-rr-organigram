<script setup lang="ts">
import { COPY } from './copy';

/**
 * A short confirmation in the corner. Controlled: the parent owns the message
 * (see `useToast`), so closing it and showing the next one cannot get out of
 * step — a dismissed toast used to swallow the next message until the
 * previous one's timer ran out.
 */
defineProps<{ message: string | null }>();
defineEmits<{ dismiss: [] }>();
</script>

<template>
    <div v-if="message" class="rr-toast" role="status" aria-live="polite">
        <span class="rr-toast__message">{{ message }}</span>
        <button
            type="button"
            class="rr-toast__close"
            :aria-label="COPY.close"
            @click="$emit('dismiss')"
        >
            ×
        </button>
    </div>
</template>

<style scoped>
.rr-toast {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--rr-bg-primary, #ffffff);
    color: var(--rr-text-primary, #1a1a1a);
    border: 0.5px solid var(--rr-border-secondary, #d1d5db);
    border-radius: var(--rr-radius-md, 8px);
    padding: 10px 12px 10px 16px;
    box-shadow: var(--rr-shadow-sm, 0 4px 12px rgba(0, 0, 0, 0.08));
    font-size: 13px;
    max-width: 360px;
}

@media (max-width: 767px) {
    .rr-toast {
        top: 8px;
        left: 8px;
        right: 8px;
        max-width: none;
    }
}

.rr-toast__message {
    flex: 1;
}

.rr-toast__close {
    background: transparent;
    border: none;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    color: var(--rr-text-secondary, #6b7280);
    padding: 0 4px;
}

.rr-toast__close:hover {
    color: var(--rr-text-primary, #1a1a1a);
}
</style>
