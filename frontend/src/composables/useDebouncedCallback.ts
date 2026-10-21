import { getCurrentScope, onScopeDispose } from "vue";

export const useDebouncedCallback = <T extends unknown[]>(
    callback: (...args: T) => unknown,
    debounceTime = 500,
) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (getCurrentScope()) {
        onScopeDispose(() => clearTimeout(timer));
    }

    return (...args: T): void => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), debounceTime);
    };
};
