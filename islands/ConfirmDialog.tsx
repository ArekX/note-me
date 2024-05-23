import { ComponentChildren } from "preact";
import Button, { ButtonColors } from "$components/Button.tsx";
import Dialog from "$islands/Dialog.tsx";

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
            {!isProcessing && (
                <div class="text-center p-2">
                    <span class="pr-4">
                        <Button
                            color={confirmColor}
                            setAsDefault={true}
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </Button>
                    </span>
                    <Button color={cancelColor} onClick={onCancel}>
                        {cancelText}
                    </Button>
                </div>
            )}
        </Dialog>
    );
}
