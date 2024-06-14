import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { FileUploaderHook } from "$islands/files/hooks/use-file-uploader.ts";

interface FileUploadProps {
    fileUploader: FileUploaderHook;
    onFileUploadDone?: () => void;
}

export default function FileUpload({
    fileUploader,
    onFileUploadDone,
}: FileUploadProps) {
    const handleFileChange = async (event: Event) => {
        const target = event.target as HTMLInputElement;

        if (target.files === null) {
            return;
        }

        const files = Array.from(target.files);

        if (files.length > 0) {
            await fileUploader.uploadFiles(files);
            onFileUploadDone?.();
        }

        target.value = "";
    };

    return (
        <>
            <Button addClass="relative" size="sm" title="Upload files...">
                <input
                    class="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer"
                    type="file"
                    title="Upload files..."
                    multiple
                    onChange={handleFileChange}
                />
                <Icon name="cloud-upload" /> Upload
            </Button>
        </>
    );
}
