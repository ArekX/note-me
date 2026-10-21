import { readonly, ref } from "vue";

export const useLoader = (initialValue = false) => {
    const isRunning = ref(initialValue);

    const run = async <R>(fn: () => Promise<R>): Promise<R> => {
        isRunning.value = true;
        try {
            return await fn();
        } finally {
            isRunning.value = false;
        }
    };

    const wrap =
        <R, T extends unknown[]>(fn: (...params: T) => Promise<R>) =>
        (...params: T) =>
            run(() => fn(...params));

    return {
        running: readonly(isRunning),
        start: () => (isRunning.value = true),
        stop: () => (isRunning.value = false),
        run,
        wrap,
    };
};
