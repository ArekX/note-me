import { useEffect } from "preact/hooks";
import { ComponentChildren, createRef } from "preact";

interface DialogProps {
    visible?: boolean;
    canCancel?: boolean;
    props?: Record<string, unknown>;
    children: ComponentChildren;
    onCancel?: () => void;
}

export default function Dialog({
    visible = true,
    children,
    canCancel = false,
    onCancel,
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
            onClick={(e) => e.stopPropagation()}
            {...props}
        >
            {children}
        </dialog>
    );
}
