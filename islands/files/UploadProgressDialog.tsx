import Dialog from "$islands/Dialog.tsx";
import { FileUploaderHook } from "$islands/files/hooks/use-file-uploader.ts";

interface UploadProgressDialogProps {
    uploader: FileUploaderHook;
}

export function UploadProgressDialog({
    uploader,
}: UploadProgressDialogProps) {
    if (!uploader.isUploading.value) {
        return null;
    }

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
        </Dialog>
    );
}
