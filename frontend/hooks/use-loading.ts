import { useSignal } from "@preact/signals";

export const useLoading = (initialValue = false) => {
    const isLoading = useSignal(initialValue);

    const start = () => isLoading.value = true;
    const stop = () => isLoading.value = false;

    return {
        value: isLoading.value,
        start,
        stop,
    };
};
