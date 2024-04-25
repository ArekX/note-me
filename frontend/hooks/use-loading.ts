import { useSignal } from "@preact/signals";

export interface LoaderHook {
    running: boolean;
    start: () => void;
    stop: () => void;
}

export const useLoader = (initialValue = false): LoaderHook => {
    const isLoading = useSignal(initialValue);

    const start = () => isLoading.value = true;
    const stop = () => isLoading.value = false;

    return {
        running: isLoading.value,
        start,
        stop,
    };
};
