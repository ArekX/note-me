import { useEffect } from "preact/hooks";
import { ComponentChildren, createRef } from "preact";
import { Button, ButtonColors } from "$components/Button.tsx";

interface ConfirmDialogProps {
  visible: boolean;
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
  confirmText = "Ok",
  cancelText = "Cancel",
  confirmColor,
  cancelColor,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = createRef<HTMLDialogElement>();

  useEffect(() => {
    if (visible) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [dialogRef, visible]);

  const handleConfirm = () => {
    onConfirm();
    dialogRef.current?.close();
  };

  const handleCancel = () => {
    onCancel();
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} onClick={e => e.stopPropagation()} class="select-none">
      <div class="p-2">{prompt}</div>
      <div class="text-center p-2">
        <span class="pr-4"><Button color={confirmColor} setAsDefault={true} onClick={handleConfirm}>{confirmText}</Button></span>
        <Button color={cancelColor} onClick={handleCancel}>{cancelText}</Button>
      </div>
    </dialog>
  );
}
