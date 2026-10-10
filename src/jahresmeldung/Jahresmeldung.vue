<script setup lang="ts">
import { computed, onMounted } from 'vue';
import DatenqualitaetPanel from './DatenqualitaetPanel.vue';
import JahresmeldungTable from './JahresmeldungTable.vue';
import OhneTeamPanel from './OhneTeamPanel.vue';
import { useJahresmeldung } from './useJahresmeldung';
import Toast from '@/shared/Toast.vue';
import ViewShell from '@/shared/ViewShell.vue';
import { COPY } from '@/shared/copy';
import { formatTimestamp } from '@/shared/format';
import { useToast } from '@/shared/useToast';
import type { Settings } from '@/shared/settings';

const props = defineProps<{ settings: Settings }>();

const { state, load } = useJahresmeldung();

function reload() {
    load(props.settings);
}

onMounted(reload);

const status = computed(() =>
    state.value.phase === 'ready'
        ? COPY.loadedAt(formatTimestamp(state.value.result.loadedAt))
        : COPY.loading,
);

const toast = useToast();

/**
 * Copy a single figure. Deliberately not "copy the whole table": the Bund's
 * portal has one input per cell, so a tab-separated block would have to be
 * taken apart again by hand.
 */
async function copyValue(value: number) {
    try {
        await navigator.clipboard.writeText(String(value));
        toast.show(COPY.jahresmeldungCopied(value));
    } catch {
        // No clipboard permission, or an insecure context. Saying nothing is
        // right here — a success toast over a failed copy would be worse than
        // no feedback, because the user would paste the previous value.
    }
}
</script>

<template>
    <ViewShell
        :title="COPY.jahresmeldungTitle"
        :status="status"
        refreshable
        :loading="state.phase === 'loading'"
        @refresh="reload"
    >
        <p class="jm__intro">{{ COPY.jahresmeldungIntro }}</p>

        <template v-if="state.phase === 'loading' || state.phase === 'idle'">
            <JahresmeldungTable
                :tally="null"
                :skeleton-rows="settings.teilstammIds.length + 1"
                @copy="copyValue"
            />
        </template>

        <p v-else-if="state.phase === 'error'" class="jm__error" role="alert">
            {{ state.message }}
        </p>
        <p v-else-if="state.phase === 'unconfigured'" class="jm__hint" role="alert">
            {{ state.message }}
        </p>

        <template v-else>
            <!--
              A banner, not a toast. A number that is quietly too low is the
              one failure mode of this view that survives all the way into a
              filing with the Bund, so it gets told in place, above the table
              it affects.
            -->
            <p v-if="state.result.tally.incomplete" class="jm__warning" role="alert">
                {{ COPY.jahresmeldungIncomplete }}
            </p>

            <JahresmeldungTable
                :tally="state.result.tally"
                :skeleton-rows="settings.teilstammIds.length + 1"
                @copy="copyValue"
            />

            <div class="jm__panels">
                <OhneTeamPanel :tally="state.result.tally" />
                <DatenqualitaetPanel :tally="state.result.tally" />
            </div>

            <details class="jm__method">
                <summary class="jm__method-summary">
                    {{ COPY.jahresmeldungMethodTitle }}
                </summary>
                <dl class="jm__method-list">
                    <template v-for="entry in COPY.jahresmeldungMethod" :key="entry.term">
                        <dt class="jm__method-term">{{ entry.term }}</dt>
                        <dd class="jm__method-text">{{ entry.text }}</dd>
                    </template>
                </dl>
                <p class="jm__method-scope">
                    {{ COPY.jahresmeldungScope(state.result.teamCount) }}
                </p>
            </details>
        </template>

        <Toast :message="toast.message.value" @dismiss="toast.dismiss" />
    </ViewShell>
</template>

<style scoped>
/* Layout only; the frame is ViewShell's. */

.jm__intro {
    margin: 0 0 20px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--rr-text-secondary);
    max-width: 72ch;
}

.jm__warning {
    margin: 0 0 16px;
    /* No warning pictograph: the default font stacks on Linux and in the
       ChurchTools host render U+26A0 as a tofu box. Colour and the heavier
       left edge carry it instead. */
    font-size: 13px;
    line-height: 1.45;
    color: var(--rr-error-fg);
    background: var(--rr-error-bg);
    border: 0.5px solid var(--rr-error-border);
    border-left-width: 3px;
    border-radius: var(--rr-radius-md);
    padding: 10px 14px;
}

.jm__hint {
    margin: 0;
    padding: 0.75rem 1rem;
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-md);
}

.jm__error {
    margin: 0;
    color: var(--rr-error-fg);
    background: var(--rr-error-bg);
    border: 0.5px solid var(--rr-error-border);
    border-radius: var(--rr-radius-md);
    padding: 0.75rem 1rem;
}

.jm__panels {
    margin-top: 16px;
    display: grid;
    grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
}

.jm__method {
    margin-top: 16px;
    font-size: 13px;
}

.jm__method-summary {
    cursor: pointer;
    color: var(--rr-text-secondary);
    width: fit-content;
}

.jm__method-summary:focus-visible {
    outline: 2px solid var(--rr-text-primary);
    outline-offset: 2px;
    border-radius: 4px;
}

.jm__method-list {
    margin: 12px 0 0;
    display: grid;
    grid-template-columns: minmax(0, 160px) minmax(0, 1fr);
    gap: 6px 16px;
    background: var(--rr-bg-primary);
    border: 0.5px solid var(--rr-border-tertiary);
    border-radius: var(--rr-radius-lg);
    padding: 16px 20px;
    max-width: 80ch;
}

.jm__method-term {
    font-weight: 500;
    font-size: 13px;
}

.jm__method-text {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--rr-text-secondary);
}

.jm__method-scope {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--rr-text-secondary);
    max-width: 80ch;
}

@media (max-width: 1023px) {
    .jm__panels {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (max-width: 767px) {
    .jm__method-list {
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
        padding: 14px;
    }
    .jm__method-term {
        margin-top: 10px;
    }
}
</style>
