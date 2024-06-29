import { useCallback } from "preact/hooks";
import { debounce, DebouncedFunction } from "$frontend/deps.ts";

export const useDebouncedCallback = <T extends unknown[]>(
    callback: (this: DebouncedFunction<T>, ...args: T) => void,
    debounceTime: number = 500,
) => {
    return useCallback(debounce(callback, debounceTime), [debounceTime]);
};
