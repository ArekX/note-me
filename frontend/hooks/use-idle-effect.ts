import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const useIdleEffect = (
    onIdle: () => void,
    idleTimeout: number | null = IDLE_TIMEOUT_MS,
    track: Array<unknown> = [],
) => {
    const idleTimeoutId = useSignal<number | null>(null);

    useEffect(() => {
        if (!idleTimeout) {
            return;
        }

        const resetIdleTimer = () => {
            if (idleTimeoutId.value !== null) {
                clearTimeout(idleTimeoutId.value);
            }

            idleTimeoutId.value = idleTimeout
                ? setTimeout(
                    onIdle,
                    idleTimeout,
                )
                : null;
        };

        addEventListener("mousemove", resetIdleTimer);
        addEventListener("keydown", resetIdleTimer);
        addEventListener("scroll", resetIdleTimer);
        addEventListener("click", resetIdleTimer);

        return () => {
            if (idleTimeoutId.value !== null) {
                clearTimeout(idleTimeoutId.value);
            }

            removeEventListener("mousemove", resetIdleTimer);
            removeEventListener("keydown", resetIdleTimer);
            removeEventListener("scroll", resetIdleTimer);
            removeEventListener("click", resetIdleTimer);
        };
    }, [onIdle, idleTimeout, ...track]);
};
