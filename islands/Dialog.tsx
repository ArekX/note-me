import { useEffect } from "preact/hooks";
import { ComponentChildren, createRef } from "preact";

interface DialogProps {
    visible: boolean;
    props?: Record<string, unknown>;
    children: ComponentChildren;
}

export default function Dialog({
    visible,
    children,
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
            onClick={(e) => e.stopPropagation()}
            {...props}
        >
            {children}
        </dialog>
    );
}
