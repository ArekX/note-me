import { useSignal } from "@preact/signals";

export interface LoaderHook {
    running: boolean;
    start: () => void;
    stop: () => void;
    wrap: <R, T extends Array<unknown>>(
        fn: (...params: T) => Promise<R>,
    ) => (...params: T) => Promise<R>;
    wrapModal: <R, T extends Array<unknown>>(
        fn: (...params: T) => Promise<R>,
    ) => (...params: T) => void;

    run: <R, T extends Array<unknown>>(
        fn: (...params: T) => Promise<R>,
        ...params: T
    ) => Promise<R>;
}

export const useLoader = (initialValue = false): LoaderHook => {
    const isLoading = useSignal(initialValue);

    const start = () => isLoading.value = true;
    const stop = () => isLoading.value = false;

    const wrap =
        <R, T extends Array<unknown>>(fn: (...params: T) => Promise<R>) =>
        (...params: T) => run(fn, ...params);

    const wrapModal =
        <R, T extends Array<unknown>>(fn: (...params: T) => Promise<R>) =>
        (...params: T): void => {
            if (isLoading.value) {
                return;
            }

            run(fn, ...params);
        };

    const run = async <R, T extends Array<unknown>>(
        fn: (...params: T) => Promise<R>,
        ...params: T
    ) => {
        start();
        try {
            return await fn(...params);
        } finally {
            stop();
        }
    };

    return {
        running: isLoading.value,
        start,
        stop,
        wrap,
        wrapModal,
        run,
    };
};
