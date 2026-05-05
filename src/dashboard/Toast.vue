<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ message: string; visible: boolean }>();
const dismissed = ref(false);

// Reset on a new toast trigger so the user can re-see it after a refresh.
watch(
    () => props.visible,
    (isVisible) => {
        if (isVisible) dismissed.value = false;
    },
);
</script>

<template>
    <div
        v-if="visible && !dismissed"
        class="rr-toast"
        role="status"
        aria-live="polite"
    >
        <span class="rr-toast__message">{{ message }}</span>
        <button
            type="button"
            class="rr-toast__close"
            aria-label="Schließen"
            @click="dismissed = true"
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
    border: 0.5px solid var(--rr-border-secondary, #d1d5db);
    border-radius: var(--rr-radius-md, 8px);
    padding: 10px 12px 10px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    font-size: 13px;
    max-width: 360px;
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
