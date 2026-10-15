<script setup lang="ts">
/**
 * A list of checkboxes bound to an array of ids. Each row is a <label>, so the
 * whole row toggles, by mouse or keyboard, with no click handlers of its own.
 *
 * Sections let one list carry a second, headed group of rows below the first.
 */
export type CheckItem = { id: number; label: string; meta?: string };
export type CheckSection = {
    items: CheckItem[];
    heading?: string;
    /** Shown in place of the rows when there are none. */
    empty?: string;
};

defineProps<{
    sections: CheckSection[];
    /** The list's name for assistive technology — the label shown above it. */
    label: string;
    /**
     * Caps the height and scrolls inside. Only for lists that can grow with
     * the installation, such as every group of a type; a short list scrolling
     * inside the page hides rows nobody knows are there.
     */
    bounded?: boolean;
}>();
const model = defineModel<number[]>({ required: true });
</script>

<template>
    <ul
        class="check-list"
        :class="{ 'check-list--bounded': bounded }"
        role="group"
        :aria-label="label"
    >
        <template v-for="(section, s) in sections" :key="s">
            <li v-if="section.heading" class="check-list__head">{{ section.heading }}</li>
            <li v-for="item in section.items" :key="item.id">
                <label
                    class="check-list__row"
                    :class="{ 'check-list__row--selected': model.includes(item.id) }"
                >
                    <input
                        v-model="model"
                        class="check-list__box"
                        type="checkbox"
                        :value="item.id"
                    />
                    <span class="check-list__label">{{ item.label }}</span>
                    <span v-if="item.meta" class="check-list__meta">{{ item.meta }}</span>
                </label>
            </li>
            <li v-if="!section.items.length && section.empty" class="check-list__empty">
                {{ section.empty }}
            </li>
        </template>
    </ul>
</template>

<style scoped>
.check-list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-md);
    background: var(--rr-bg-primary);
}

.check-list--bounded {
    max-height: 320px;
    overflow-y: auto;
}

.check-list > li {
    border-bottom: 0.5px solid var(--rr-border-tertiary);
}
.check-list > li:last-child {
    border-bottom: 0;
}

.check-list__row {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.5rem 0.875rem;
    cursor: pointer;
    transition: background-color var(--rr-dur-hover) var(--rr-ease-out);
}
.check-list__row:hover {
    background: var(--rr-bg-hover-on-white);
}
.check-list__row:focus-within {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: -2px;
}
.check-list__row--selected,
.check-list__row--selected:hover {
    background: var(--rr-accent-bg);
    color: var(--rr-accent-fg);
}
.check-list__box {
    flex-shrink: 0;
    margin: 0;
    width: 1rem;
    height: 1rem;
    accent-color: var(--rr-accent-fg);
    cursor: inherit;
}

.check-list__label {
    flex: 1;
    min-width: 0;
    font-size: 0.95rem;
}

.check-list__meta {
    /* May wrap: "in ChurchTools als Leitung markiert · 10 Personen" is wider
       than a phone row. */
    flex-shrink: 1;
    min-width: 0;
    text-align: right;
    font-size: 0.8125rem;
    color: var(--rr-text-secondary);
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
.check-list__row--selected .check-list__meta {
    color: var(--rr-accent-fg);
    opacity: 0.8;
}

.check-list__head {
    padding: 10px 10px 4px;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--rr-text-secondary);
}

.check-list__empty {
    padding: 0.75rem 0.875rem;
    color: var(--rr-text-secondary);
    font-size: 0.875rem;
    font-style: italic;
}

/* Phone: the meta goes below the label instead of squeezing it. */
@media (max-width: 767px) {
    .check-list__row {
        flex-wrap: wrap;
        row-gap: 0.125rem;
    }
    .check-list__meta {
        flex-basis: 100%;
        padding-left: 1.75rem;
        text-align: left;
    }
}
</style>
