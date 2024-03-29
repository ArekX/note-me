import { signal } from "@preact/signals";
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
    onOpened: () => void,
    onClosed?: () => void,
) => {
    const open = () => {
        currentIdentifier.value = identifier;

        if (currentIdentifier.value && isPopoverOpen(identifier)) {
            onClosed?.();
        }
    };

    const close = () => {
        currentIdentifier.value = null;
    };

    useEffect(() => {
        if (currentIdentifier.value && isPopoverOpen(identifier)) {
            onClosed?.();
        }
    }, [currentIdentifier.value]);

    useEffect(() => {
        if (menuRef.current) {
            onOpened();
        }
    }, [menuRef]);

    useEffect(() => {
        if (!menuRef.current) {
            return;
        }

        const handleDocumentClick = (event: Event) => {
            if (!menuRef.current!) {
                return;
            }

            if (menuRef.current.contains(event.target as Node)) {
                return;
            }

            close();
        };

        document.body.addEventListener("click", handleDocumentClick);

        return () => {
            document.body.removeEventListener("click", handleDocumentClick);
        };
    }, [menuRef]);

    const isOpen = useMemo(() => currentIdentifier.value === identifier, [
        currentIdentifier.value,
    ]);

    return {
        isOpen,
        open,
        close,
    };
};
