import { onBeforeUnmount, ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * How many columns `count` cards get in `width` pixels, so the rows come out
 * even: as many rows as needed at the widest fit, then as few columns as fill
 * them. Six cards where five fit become 3 + 3, not 5 + 1 with an orphan; seven
 * become 4 + 3. Nothing here knows how many Teilstämme a Stamm has.
 */
export function balancedColumns(width: number, count: number, minWidth: number, gap: number) {
    if (count <= 0) return 1;
    const fit = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
    const rows = Math.ceil(count / fit);
    return Math.ceil(count / rows);
}

/**
 * The grid's measured column count, or null below `fromWidth` and before the
 * first measurement — the stylesheet's own layout then applies (mobile stack,
 * or `auto-fit` without JavaScript).
 */
export function useBalancedColumns(
    el: Ref<HTMLElement | null>,
    count: () => number,
    { minWidth = 240, gap = 12, fromWidth = 768 } = {},
) {
    const columns = ref<number | null>(null);
    let observer: ResizeObserver | null = null;

    function measure() {
        const width = el.value?.clientWidth ?? 0;
        // The viewport decides the breakpoint, as the stylesheet's media query does.
        columns.value =
            window.innerWidth < fromWidth || width === 0
                ? null
                : balancedColumns(width, count(), minWidth, gap);
    }

    // Re-attached whenever the grid element is replaced — it lives inside a
    // branch that a reload can unmount and mount again — and re-measured when
    // the number of cards changes without a resize.
    watch(
        [el, count],
        ([target]) => {
            observer?.disconnect();
            observer = null;
            if (!target || typeof ResizeObserver === 'undefined') {
                columns.value = null;
                return;
            }
            observer = new ResizeObserver(measure);
            observer.observe(target);
            measure();
        },
        { flush: 'post' },
    );
    onBeforeUnmount(() => observer?.disconnect());

    return { columns, measure };
}
