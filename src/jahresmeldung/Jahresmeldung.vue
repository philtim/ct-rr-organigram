<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DatenqualitaetPanel from './DatenqualitaetPanel.vue';
import JahresmeldungTable from './JahresmeldungTable.vue';
import OhneTeamPanel from './OhneTeamPanel.vue';
import { useJahresmeldung } from './useJahresmeldung';
import Toast from '@/dashboard/Toast.vue';
import { formatTimestamp } from '@/dashboard/useDashboard';
import { COPY } from '@/shared/constants';
import type { Settings } from '@/shared/settings';

const props = defineProps<{ settings: Settings }>();

const { state, load } = useJahresmeldung();

function reload() {
    load(props.settings);
}

onMounted(reload);

const stand = computed(() =>
    state.value.phase === 'ready' ? formatTimestamp(state.value.result.loadedAt) : null,
);

const toast = ref<string | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Copy a single figure. Deliberately not "copy the whole table": the Bund's
 * portal has one input per cell, so a tab-separated block would have to be
 * taken apart again by hand.
 */
async function copyValue(value: number) {
    try {
        await navigator.clipboard.writeText(String(value));
        showToast(COPY.jahresmeldungCopied(value));
    } catch {
        // No clipboard permission, or an insecure context. Saying nothing is
        // right here — a success toast over a failed copy would be worse than
        // no feedback, because the user would paste the previous value.
    }
}

function showToast(message: string) {
    toast.value = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = null), 2000);
}
</script>

<template>
    <main class="jm">
        <div class="jm__inner">
            <header class="jm__header">
                <div class="jm__title-block">
                    <h1 class="jm__title">{{ COPY.jahresmeldungTitle }}</h1>
                    <p class="jm__subtitle">
                        <template v-if="stand"> {{ COPY.timestampPrefix }}{{ stand }} </template>
                        <template v-else>{{ COPY.loading }}</template>
                    </p>
                </div>
                <button
                    type="button"
                    class="jm__refresh"
                    :disabled="state.phase === 'loading'"
                    @click="reload"
                >
                    ↻ <span class="jm__refresh-label">{{ COPY.refresh }}</span>
                </button>
            </header>

            <p class="jm__intro">{{ COPY.jahresmeldungIntro }}</p>

            <template v-if="state.phase === 'loading' || state.phase === 'idle'">
                <JahresmeldungTable :tally="null" @copy="copyValue" />
            </template>

            <p v-else-if="state.phase === 'error'" class="jm__error" role="alert">
                {{ state.message }}
            </p>

            <template v-else>
                <!--
                  A banner, not just the toast the organigram uses. A number
                  that is quietly too low is the one failure mode of this view
                  that survives all the way into a filing with the Bund, so it
                  gets told in place, above the table it affects.
                -->
                <p v-if="state.result.tally.incomplete" class="jm__warning" role="alert">
                    {{ COPY.jahresmeldungIncomplete }}
                </p>

                <JahresmeldungTable :tally="state.result.tally" @copy="copyValue" />

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

            <Toast :visible="toast !== null" :message="toast ?? ''" />
        </div>
    </main>
</template>

<style scoped>
/* Same two-layer shell as the organigram: full-width band for the background,
   centred column capped at 1280px for the content. */
.jm {
    background: var(--rr-bg-tertiary);
    color: var(--rr-text-primary);
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    min-height: 100vh;
}

.jm__inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px;
}

.jm__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 12px;
}

.jm__title-block {
    min-width: 0;
}

.jm__title {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 500;
}

.jm__subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--rr-text-secondary);
}

.jm__refresh {
    background: var(--rr-bg-primary);
    border: 1px solid var(--rr-border-secondary);
    border-radius: var(--rr-radius-md);
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--rr-text-primary);
    flex-shrink: 0;
}

.jm__refresh:disabled {
    opacity: 0.5;
    cursor: progress;
}

.jm__refresh-label {
    margin-left: 4px;
}

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
    border-left-width: 3px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--rr-error-fg);
    background: var(--rr-error-bg);
    border: 0.5px solid var(--rr-error-border);
    border-radius: var(--rr-radius-md);
    padding: 10px 14px;
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
    .jm__inner {
        padding: 16px;
    }
    .jm__title {
        font-size: 18px;
    }
    .jm__refresh-label {
        display: none;
    }
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
