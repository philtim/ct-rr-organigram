<script setup lang="ts">
import { computed } from 'vue';
import type { Column, Tally } from './tally';
import { COPY } from '@/shared/constants';

/**
 * `tally: null` renders the skeleton. Same component, same markup, so the
 * loading state cannot drift from the real table and nothing shifts when the
 * data arrives (US-4).
 */
const props = defineProps<{ tally: Tally | null }>();
const emit = defineEmits<{ copy: [number] }>();

/**
 * Two labels per column: the full one the form uses, and a short one for
 * narrow screens. The `<th>` carries the full text as `aria-label` either way,
 * so a screen reader never has to expand "JL m" — and the visible spans are
 * hidden from it to avoid announcing both.
 */
type ColumnDef = {
    key: Column;
    /** Visible heading, one entry per rendered line. */
    lines: string[];
    /** Visible heading on narrow screens. */
    short: string;
    /** What a screen reader announces, always the form's full wording. */
    label: string;
};

const COLUMN_DEFS: ColumnDef[] = [
    {
        key: 'jungen',
        lines: ['Jungen'],
        short: 'Jungen',
        label: COPY.jahresmeldungColJungen,
    },
    {
        key: 'maedchen',
        lines: ['Mädchen'],
        short: 'Mädchen',
        label: COPY.jahresmeldungColMaedchen,
    },
    {
        key: 'juniorleiterM',
        lines: ['Juniorleiter', 'männlich'],
        short: 'JL m',
        label: COPY.jahresmeldungColJuniorM,
    },
    {
        key: 'juniorleiterW',
        lines: ['Juniorleiter', 'weiblich'],
        short: 'JL w',
        label: COPY.jahresmeldungColJuniorW,
    },
    {
        key: 'mitarbeiterM',
        lines: ['Mitarbeiter', 'männlich'],
        short: 'MA m',
        label: COPY.jahresmeldungColMitarbeiterM,
    },
    {
        key: 'mitarbeiterW',
        lines: ['Mitarbeiter', 'weiblich'],
        short: 'MA w',
        label: COPY.jahresmeldungColMitarbeiterW,
    },
];

const UNASSIGNED: Column = 'ohneZuordnung';

const UNASSIGNED_DEF: ColumnDef = {
    key: UNASSIGNED,
    lines: ['ohne', 'Zuordnung'],
    short: COPY.jahresmeldungColUnassigned,
    // Says out loud what the heavier border says visually.
    label: COPY.jahresmeldungColUnassignedNote,
};

/**
 * The seventh column appears only when somebody is in it. In the normal case
 * the table is exactly the Bund's form; the extra column shows up only when
 * there is something to resolve.
 */
const showUnassigned = computed(() => props.tally?.hasUnassigned === true);

const columns = computed(() =>
    showUnassigned.value ? [...COLUMN_DEFS, UNASSIGNED_DEF] : COLUMN_DEFS,
);

/** Skeleton placeholders: five Teilstämme plus the "ohne Team" row. */
const SKELETON_ROWS = 6;

function cellOf(cells: Record<Column, number>, key: Column): number {
    return cells[key];
}

/** Every column of a row the loader could not complete reads "?", never 0. */
function isUnknown(incomplete: boolean): boolean {
    return incomplete;
}

/**
 * Any failure anywhere makes the footer unknown too. A Gesamt row that silently
 * omits one Teilstamm is the single most expensive thing this view could
 * render: it looks exactly like a correct answer.
 */
const footerUnknown = computed(() => props.tally?.incomplete === true);
</script>

<template>
    <section class="jm-table" aria-labelledby="jm-table-title">
        <h2 id="jm-table-title" class="jm-table__title">{{ COPY.jahresmeldungTableTitle }}</h2>

        <div class="jm-table__scroll">
            <table class="jm-table__table">
                <caption class="jm-table__caption">
                    {{
                        COPY.jahresmeldungTableCaption
                    }}
                </caption>
                <thead>
                    <tr>
                        <th scope="col" class="jm-table__row-head">
                            <span class="jm-table__sr">Teilstamm</span>
                        </th>
                        <th
                            v-for="col in columns"
                            :key="col.key"
                            scope="col"
                            class="jm-table__col-head"
                            :class="{ 'jm-table__col-head--extra': col.key === UNASSIGNED }"
                            :aria-label="col.label"
                        >
                            <span class="jm-table__col-long" aria-hidden="true">
                                <template v-for="(line, i) in col.lines" :key="i">
                                    <br v-if="i > 0" />{{ line }}
                                </template>
                            </span>
                            <span class="jm-table__col-short" aria-hidden="true">
                                {{ col.short }}
                            </span>
                        </th>
                    </tr>
                </thead>

                <tbody v-if="!tally">
                    <tr v-for="i in SKELETON_ROWS" :key="i">
                        <th scope="row" class="jm-table__row-head">
                            <span class="jm-sk jm-sk--label"></span>
                        </th>
                        <td v-for="col in columns" :key="col.key" class="jm-table__cell">
                            <span class="jm-sk jm-sk--value"></span>
                        </td>
                    </tr>
                </tbody>

                <tbody v-else>
                    <tr
                        v-for="row in tally.rows"
                        :key="row.key"
                        :class="{ 'jm-table__row--unknown': row.incomplete }"
                    >
                        <th scope="row" class="jm-table__row-head">{{ row.label }}</th>
                        <td
                            v-for="col in columns"
                            :key="col.key"
                            class="jm-table__cell"
                            :class="{ 'jm-table__cell--extra': col.key === UNASSIGNED }"
                        >
                            <span
                                v-if="isUnknown(row.incomplete)"
                                class="jm-table__unknown"
                                :aria-label="COPY.jahresmeldungUnknownCell"
                                >?</span
                            >
                            <button
                                v-else
                                type="button"
                                class="jm-table__value"
                                @click="emit('copy', cellOf(row.cells, col.key))"
                            >
                                {{ cellOf(row.cells, col.key) }}
                            </button>
                        </td>
                    </tr>
                </tbody>

                <tfoot v-if="tally">
                    <tr>
                        <th scope="row" class="jm-table__row-head">
                            {{ COPY.jahresmeldungRowTotal }}
                        </th>
                        <td
                            v-for="col in columns"
                            :key="col.key"
                            class="jm-table__cell"
                            :class="{ 'jm-table__cell--extra': col.key === UNASSIGNED }"
                        >
                            <span
                                v-if="footerUnknown"
                                class="jm-table__unknown"
                                :aria-label="COPY.jahresmeldungUnknownCell"
                                >?</span
                            >
                            <button
                                v-else
                                type="button"
                                class="jm-table__value"
                                @click="emit('copy', cellOf(tally.total, col.key))"
                            >
                                {{ cellOf(tally.total, col.key) }}
                            </button>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <p v-if="showUnassigned" class="jm-table__note">
            {{ COPY.jahresmeldungUnassignedHint }}
        </p>
        <p class="jm-table__note jm-table__note--quiet">{{ COPY.jahresmeldungCopyHint }}</p>
    </section>
</template>

<style scoped>
.jm-table {
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px 20px;
}

.jm-table__title {
    margin: 0 0 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--rr-text-secondary);
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

/* Horizontal scroll lives on a wrapper so the sticky first column has a
   scroll container to stick inside. */
.jm-table__scroll {
    overflow-x: auto;
}

.jm-table__table {
    width: 100%;
    border-collapse: collapse;
    /* Figures must line up vertically to be comparable at a glance. */
    font-variant-numeric: tabular-nums;
}

.jm-table__caption,
.jm-table__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}

.jm-table__col-head {
    padding: 6px 8px 10px;
    font-size: 12px;
    font-weight: 500;
    color: var(--rr-text-secondary);
    text-align: right;
    vertical-align: bottom;
    line-height: 1.3;
    border-bottom: 0.5px solid var(--rr-border-secondary);
    /* Four digits plus padding — three-digit figures must not reflow. */
    min-width: 72px;
}

.jm-table__col-short {
    display: none;
}

/* The seventh column is not part of the form. The heavier left border says so
   before the footnote does. */
.jm-table__col-head--extra,
.jm-table__cell--extra {
    border-left: 2px solid var(--rr-border-secondary);
}

.jm-table__row-head {
    padding: 8px 12px 8px 4px;
    font-size: 13px;
    font-weight: 400;
    color: var(--rr-text-secondary);
    text-align: left;
    /* Teilstamm names wrap rather than truncate: the name is how the reader
       maps the row onto the Bund's form. */
    min-width: 160px;
    background: var(--rr-bg-primary);
}

.jm-table__cell {
    padding: 0;
    text-align: right;
    border-top: 0.5px solid var(--rr-border-tertiary);
}

tbody tr:nth-child(even) .jm-table__cell,
tbody tr:nth-child(even) .jm-table__row-head {
    /* Very faint — enough to keep the eye on one row across seven columns,
       not enough to cost the figures any contrast. */
    background: var(--rr-bg-secondary);
}

.jm-table__value {
    appearance: none;
    border: 0;
    background: none;
    font: inherit;
    font-size: 15px;
    font-variant-numeric: tabular-nums;
    color: var(--rr-text-primary);
    padding: 8px 8px;
    width: 100%;
    text-align: right;
    cursor: pointer;
    border-radius: var(--rr-radius-md);
    transition: background var(--rr-dur-hover) var(--rr-ease-out);
}

.jm-table__value:hover {
    background: var(--rr-bg-hover-on-white);
}

.jm-table__value:focus-visible {
    outline: 2px solid var(--rr-text-primary);
    outline-offset: -2px;
}

.jm-table__unknown {
    display: block;
    padding: 8px;
    font-size: 15px;
    color: var(--rr-error-fg);
}

.jm-table__row--unknown .jm-table__row-head {
    color: var(--rr-error-fg);
}

tfoot .jm-table__row-head,
tfoot .jm-table__value {
    font-weight: 600;
    color: var(--rr-text-primary);
}

tfoot .jm-table__cell {
    border-top: 2px solid var(--rr-border-secondary);
}

.jm-table__note {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
}

.jm-table__note--quiet {
    opacity: 0.75;
}

/* Skeleton: same cells, grey bars instead of figures (US-4). */
.jm-sk {
    display: inline-block;
    height: 12px;
    border-radius: 4px;
    background: var(--rr-bg-tertiary);
    animation: jm-pulse 1.4s ease-in-out infinite;
}

.jm-sk--label {
    width: 70%;
    min-width: 90px;
}

.jm-sk--value {
    width: 28px;
    margin: 10px 8px;
}

@keyframes jm-pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.45;
    }
}

@media (prefers-reduced-motion: reduce) {
    .jm-sk {
        animation: none;
    }
}

@media (max-width: 1023px) {
    .jm-table__col-head {
        min-width: 60px;
    }
}

@media (max-width: 767px) {
    .jm-table {
        padding: 14px;
    }

    .jm-table__col-long {
        display: none;
    }

    .jm-table__col-short {
        display: inline;
    }

    /* The row label stays put while the figures scroll under it — without it
       you lose track of which Teilstamm you are reading. */
    .jm-table__row-head {
        position: sticky;
        left: 0;
        z-index: 1;
        min-width: 110px;
        font-size: 12px;
        /* Shadow marks the seam and hints that there is more to the right. */
        box-shadow: 4px 0 6px -4px rgba(0, 0, 0, 0.18);
    }

    .jm-table__col-head {
        min-width: 56px;
        font-size: 11px;
    }

    .jm-table__value,
    .jm-table__unknown {
        font-size: 14px;
        padding: 8px 6px;
    }
}
</style>
