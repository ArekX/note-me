import Dialog from "$islands/Dialog.tsx";
import { FileUploaderHook } from "$islands/files/hooks/use-file-uploader.ts";
import Button from "$components/Button.tsx";
import { addMessage } from "$frontend/toast-message.ts";

interface UploadProgressDialogProps {
    uploader: FileUploaderHook;
}

export function UploadProgressDialog({
    uploader,
}: UploadProgressDialogProps) {
    if (!uploader.isUploading.value) {
        return null;
    }

    const handleCancelUpload = () => {
        uploader.cancelUpload();
        addMessage({
            type: "success",
            text: "Upload cancelled",
        });
    };

    return (
        <Dialog canCancel={false}>
            <p class="text-center pb-2">
                Uploading progress {uploader.donePercentage}%
            </p>
            <progress
                class="w-full"
                max={uploader.totalSizeToUpload.value}
                min="0"
                value={uploader.uploadedSize.value}
            />

            <div class="text-center py-4">
                <Button
                    color="danger"
                    onClick={handleCancelUpload}
                >
                    Cancel
                </Button>
            </div>
        </Dialog>
    );
}
