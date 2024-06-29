import { useSignal } from "@preact/signals";

export const useDebouncedCallback = <R, T extends Array<unknown>>(
    callback: (...args: T) => R,
    debounceTime: number = 500,
) => {
    const callId = useSignal(0);

    return (...args: T): void => {
        clearTimeout(callId.value);
        callId.value = setTimeout(() => callback(...args), debounceTime);
    };
};
