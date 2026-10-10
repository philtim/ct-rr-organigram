import { onUnmounted, ref } from 'vue';

/** A message that clears itself after `ms`, for `Toast.vue`. */
export function useToast(ms = 2000) {
    const message = ref<string | null>(null);
    let timer: ReturnType<typeof setTimeout> | undefined;

    function dismiss() {
        clearTimeout(timer);
        message.value = null;
    }

    function show(text: string) {
        clearTimeout(timer);
        message.value = text;
        timer = setTimeout(dismiss, ms);
    }

    onUnmounted(() => clearTimeout(timer));

    return { message, show, dismiss };
}
