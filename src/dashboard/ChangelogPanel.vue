<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue';
import { profileLinks } from './duplicates';
import type { OrgNode } from './types';
import { useChangelog } from './useChangelog';
import type { ChangeEntry } from '@/shared/changelog';
import { COPY } from '@/shared/copy';
import { formatDateTime, formatDayMonth } from '@/shared/format';
import PersonLink from '@/shared/PersonLink.vue';

/**
 * Membership changes of the last 30 days, as the admin stored them
 * (docs/design/003-aenderungsprotokoll.md). Reads the KV-Store only —
 * no log call, no permission check — and says on every render when that
 * stand was fetched: an old list that looks complete is the one failure
 * this panel must not produce.
 */
const props = defineProps<{
    /** The loaded organigram, for ChurchTools' own profile links (ADR-013). */
    root: OrgNode | null;
}>();

const { state, load } = useChangelog();
onMounted(load);

const links = computed(() => (props.root ? profileLinks(props.root) : new Map<number, string>()));
const log = computed(() => (state.value.phase === 'ready' ? state.value.log : null));

/**
 * Rows shown before "Alle N Änderungen zeigen". The reader wants what moved
 * since their last look, days ago, not the whole month; the hidden rows are
 * the oldest, the ones already seen. Same preview size as DatenqualitaetPanel.
 */
const VISIBLE_ROWS = 10;
const expanded = ref(false);
const listId = useId();
const collapsible = computed(() => (log.value?.entries.length ?? 0) > VISIBLE_ROWS);
const visible = computed(() =>
    !log.value ? [] : expanded.value ? log.value.entries : log.value.entries.slice(0, VISIBLE_ROWS),
);

const SIGN = { added: '+', removed: '–', role: '~', status: '~' } as const;

function detail(e: ChangeEntry): string {
    switch (e.kind) {
        case 'added':
        case 'removed':
            return [e.role, e.to && COPY.changelogStatusLabel(e.to)].filter(Boolean).join(' · ');
        case 'role':
            return COPY.changelogRoleChange(e.from ?? '', e.role ?? '');
        case 'status':
            return COPY.changelogStatusChange(e.from ?? '', e.to ?? '');
    }
}
</script>

<template>
    <section class="chg" :aria-labelledby="'rr-changelog-title'">
        <h2 id="rr-changelog-title" class="chg__title">{{ COPY.changelogTitle }}</h2>

        <p v-if="state.phase === 'loading'" class="chg__note">{{ COPY.loading }}</p>
        <p v-else-if="state.phase === 'never'" class="chg__note" role="status">
            {{ COPY.changelogNever }}
        </p>
        <p v-else-if="state.phase === 'unreadable'" class="chg__note chg__note--error" role="alert">
            {{ COPY.changelogUnreadable }}
        </p>

        <template v-else-if="log">
            <p class="chg__stand">
                {{ COPY.changelogStand(formatDateTime(new Date(log.syncedAt))) }}
                <span class="chg__stand-note">{{ COPY.changelogStandNote }}</span>
            </p>
            <p v-if="!log.entries.length" class="chg__note">{{ COPY.changelogEmpty }}</p>
            <ul v-else :id="listId" class="chg__list">
                <li v-for="e in visible" :key="`${e.logId}-${e.kind}`" class="chg__row">
                    <span class="chg__date">{{ formatDayMonth(new Date(e.at)) }}</span>
                    <span class="chg__sign" :class="`chg__sign--${e.kind}`" aria-hidden="true">
                        {{ SIGN[e.kind] }}
                    </span>
                    <span class="chg__sr">{{ COPY.changelogKind[e.kind] }}</span>
                    <span class="chg__name">
                        <PersonLink
                            v-if="e.personId !== null && links.get(e.personId)"
                            :name="e.personName"
                            :href="links.get(e.personId)!"
                        />
                        <template v-else>{{ e.personName }}</template>
                    </span>
                    <span class="chg__group">{{ e.groupName }}</span>
                    <span class="chg__detail">{{ detail(e) }}</span>
                    <span v-if="e.actor" class="chg__actor">{{ COPY.changelogBy(e.actor) }}</span>
                </li>
            </ul>
            <button
                v-if="collapsible"
                type="button"
                class="chg__more"
                :aria-expanded="expanded"
                :aria-controls="listId"
                @click="expanded = !expanded"
            >
                {{ expanded ? COPY.changelogShowFewer : COPY.changelogShowAll(log.entries.length) }}
            </button>
        </template>
    </section>
</template>

<style scoped>
.chg {
    margin-top: 24px;
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px 20px;
}

.chg__title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 500;
}

/* Always above the list, never folded away: the age of the list is the point. */
.chg__stand {
    margin: 0 0 12px;
    font-size: 13px;
}
.chg__stand-note {
    color: var(--rr-text-secondary);
}

.chg__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}

.chg__note {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--rr-text-secondary);
}
.chg__note--error {
    color: var(--rr-error-fg);
}

/* The list owns the tracks; each row is a subgrid, so columns line up across rows. */
.chg__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: 3.25em 1.25em minmax(0, 1fr) minmax(0, 1.4fr) auto auto;
    gap: 4px 0;
}

/* One card per entry, like the Hinweise items above. */
.chg__row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    gap: 0 10px;
    align-items: baseline;
    padding: 6px 10px;
    background: var(--rr-bg-secondary);
    border-radius: var(--rr-radius-md);
    font-size: 13px;
}

.chg__date {
    font-variant-numeric: tabular-nums;
    color: var(--rr-text-secondary);
}

.chg__sign {
    text-align: center;
    font-weight: 600;
}
.chg__sign--added {
    color: var(--rr-success-fg);
}
.chg__sign--removed {
    color: var(--rr-error-fg);
}

.chg__name {
    font-weight: 500;
    min-width: 0;
}

.chg__group,
.chg__detail {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.chg__detail,
.chg__actor {
    color: var(--rr-text-secondary);
}
.chg__actor {
    font-size: 12px;
    white-space: nowrap;
    text-align: right;
}

/* Same control as the Teilstamm cards' "Alle N Teams zeigen". */
.chg__more {
    margin-top: 10px;
    padding: 4px 8px;
    font: inherit;
    font-size: 12px;
    color: var(--rr-text-secondary);
    background: transparent;
    border: 0.5px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    cursor: pointer;
}
.chg__more:hover {
    color: var(--rr-text-primary);
    background: var(--rr-bg-hover-on-white);
}
.chg__more:focus-visible {
    outline: 2px solid var(--rr-text-secondary);
    outline-offset: 1px;
}

/* Mobile: date, sign and name on the first line; the rest below. */
@media (max-width: 767px) {
    .chg {
        margin-top: 16px;
        padding: 14px;
    }
    .chg__list {
        gap: 6px 0;
    }
    .chg__row {
        grid-template-columns: 3.25em 1.25em auto minmax(0, 1fr);
        grid-template-areas:
            'date sign name name'
            '.    .    group detail'
            '.    .    actor actor';
        gap: 1px 10px;
        padding: 8px;
    }
    .chg__group,
    .chg__detail {
        white-space: normal;
        overflow: visible;
    }
    .chg__actor {
        text-align: left;
    }
    .chg__more {
        padding: 8px 12px;
    }
    .chg__date {
        grid-area: date;
    }
    .chg__sign {
        grid-area: sign;
    }
    .chg__name {
        grid-area: name;
    }
    .chg__group {
        grid-area: group;
    }
    .chg__detail {
        grid-area: detail;
    }
    .chg__actor {
        grid-area: actor;
    }
}
</style>
