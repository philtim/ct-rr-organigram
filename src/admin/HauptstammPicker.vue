<script setup lang="ts">
import { computed, ref } from 'vue';
import { searchGroups } from './scope';
import { COPY } from '@/shared/constants';
import type { Group } from '@/shared/types';

/**
 * Search the installation's groups and pick the Hauptstamm. The results are
 * buttons, so they can be reached and chosen by keyboard.
 */
const props = defineProps<{ groups: Group[]; selected: Group | undefined }>();
const emit = defineEmits<{ select: [id: number] }>();

const query = ref('');
const results = computed(() => searchGroups(props.groups, query.value));

function choose(id: number) {
    emit('select', id);
    query.value = '';
}
</script>

<template>
    <p v-if="selected" class="picker__chosen">
        {{ selected.name }}
        <span class="picker__id">{{ COPY.adminGroupId(selected.id) }}</span>
    </p>
    <input
        id="rr-admin-search"
        v-model="query"
        class="picker__search"
        type="search"
        :placeholder="COPY.adminSearchPlaceholder"
    />
    <ul v-if="query.trim()" class="picker__list">
        <li v-for="group in results" :key="group.id">
            <button
                type="button"
                class="picker__option"
                :class="{ 'picker__option--selected': group.id === selected?.id }"
                @click="choose(group.id)"
            >
                <span>{{ group.name }}</span>
                <span class="picker__id">{{ COPY.adminGroupId(group.id) }}</span>
            </button>
        </li>
        <li v-if="!results.length" class="picker__empty">{{ COPY.adminNoGroupFound }}</li>
    </ul>
</template>

<style scoped>
.picker__chosen {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
}

.picker__search {
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    border: 0.5px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-bg-primary);
    color: inherit;
}
.picker__search:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 1px;
}

.picker__list {
    display: flex;
    flex-direction: column;
    max-height: 320px;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-bg-primary);
}
.picker__list > li {
    border-bottom: 0.5px solid var(--rr-border-tertiary);
}
.picker__list > li:last-child {
    border-bottom: 0;
}

.picker__option {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    padding: 0.5rem 0.875rem;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    font: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background-color var(--rr-dur-hover) var(--rr-ease-out);
}
.picker__option:hover {
    background: var(--rr-bg-hover-on-white);
}
.picker__option:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: -2px;
}
.picker__option--selected,
.picker__option--selected:hover {
    background: var(--rr-accent-bg);
    color: var(--rr-accent-fg);
}

.picker__id {
    flex-shrink: 0;
    font-size: 0.8125rem;
    font-weight: 400;
    color: var(--rr-text-secondary);
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

.picker__empty {
    padding: 0.75rem 0.875rem;
    color: var(--rr-text-secondary);
    font-size: 0.875rem;
    font-style: italic;
}
</style>
