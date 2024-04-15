import { useSignal } from "@preact/signals";

export const useLoader = (initialValue = false) => {
    const isLoading = useSignal(initialValue);

    const start = () => isLoading.value = true;
    const stop = () => isLoading.value = false;

    return {
        running: isLoading.value,
        start,
        stop,
    };
};
