import { ComponentChildren } from "preact";
import Button, { ButtonColors } from "$components/Button.tsx";
import Dialog from "$islands/Dialog.tsx";
import Loader from "$islands/Loader.tsx";

interface ConfirmDialogProps {
    visible: boolean;
    isProcessing?: boolean;
    prompt: string | ComponentChildren;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: ComponentChildren;
    cancelText?: string | ComponentChildren;
    confirmColor?: ButtonColors;
    cancelColor?: ButtonColors;
}

export default function ConfirmDialog({
    visible,
    prompt,
    isProcessing = false,
    confirmText = "Ok",
    cancelText = "Cancel",
    confirmColor,
    cancelColor,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <Dialog
            visible={visible}
            canCancel={true}
            onCancel={onCancel}
            props={{ "class": "select-none" }}
        >
            <div class="p-2">{prompt}</div>
            {isProcessing
                ? <Loader color="white">Processing...</Loader>
                : (
                    <div class="flex flex-wrap items-center justify-center p-2">
                        <Button
                            color={confirmColor}
                            setAsDefault={true}
                            onClick={onConfirm}
                            addClass="max-md:basis-3/4"
                        >
                            {confirmText}
                        </Button>

                        <Button
                            color={cancelColor}
                            onClick={onCancel}
                            addClass="max-md:basis-3/4 max-md:mt-2 md:ml-2"
                        >
                            {cancelText}
                        </Button>
                    </div>
                )}
        </Dialog>
    );
}
