import { useEffect } from "preact/hooks";
import { ComponentChildren, createRef } from "preact";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";
import { ComponentChild } from "preact";

interface DialogProps {
    visible?: boolean;
    canCancel?: boolean;
    props?: Record<string, unknown>;
    children: ComponentChildren;
    title?: string | ComponentChild;
    onCancel?: () => void;
}

export default function Dialog({
    visible = true,
    children,
    canCancel = false,
    onCancel,
    title,
    props,
}: DialogProps) {
    const dialogRef = createRef<HTMLDialogElement>();

    useEffect(() => {
        if (visible) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [dialogRef, visible]);

    return (
        <dialog
            ref={dialogRef}
            onCancel={(e) => {
                if (canCancel) {
                    onCancel?.();
                    return;
                }

                e.preventDefault();
            }}
            onClick={(e) => {
                closeAllPopovers();
                e.stopPropagation();
            }}
            {...props}
        >
            {title && <h1 class="text-xl font-semibold mb-5">{title}</h1>}
            {children}
        </dialog>
    );
}
