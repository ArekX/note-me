import { signal, useSignal } from "@preact/signals";
import { Ref, useEffect, useMemo } from "preact/hooks";

export type PopoverId = `${string}-${number}`;

const currentIdentifier = signal<PopoverId | null>(null);

export const isPopoverOpen = (identifier: PopoverId) => {
    return currentIdentifier.value === identifier;
};

export const closeAllPopovers = () => {
    currentIdentifier.value = null;
};

export const useSinglePopover = <T extends Node>(
    identifier: PopoverId,
    menuRef: Ref<T>,
    onOpened?: () => void,
    onClosed?: () => void,
) => {
    const state = useSignal<"ready" | "opening" | "closing">("ready");

    const open = () => {
        if (currentIdentifier.value === identifier) {
            return;
        }

        state.value = "opening";
        currentIdentifier.value = identifier;
    };

    const close = () => {
        if (currentIdentifier.value === null) {
            return;
        }

        state.value = "closing";
        currentIdentifier.value = null;
    };

    useEffect(() => {
        if (!menuRef.current) {
            return;
        }

        if (state.value === "ready" && !isPopoverOpen(identifier)) {
            close();
        } else if (state.value === "opening") {
            onOpened?.();
            state.value = "ready";
        } else if (state.value === "closing") {
            onClosed?.();
            state.value = "ready";
        }
    }, [menuRef, currentIdentifier.value]);

    useEffect(() => {
        if (!menuRef.current) {
            return;
        }

        const handle = (event: Event) => {
            if (
                !menuRef.current! ||
                menuRef.current.contains(event.target as Node)
            ) {
                return;
            }

            close();
        };

        document.body.addEventListener("click", handle);

        return () => {
            document.body.removeEventListener("click", handle);
        };
    }, [menuRef]);

    const isOpen = useMemo(
        () => currentIdentifier.value === identifier,
        [currentIdentifier.value],
    );

    return {
        isOpen,
        open,
        close,
    };
};
