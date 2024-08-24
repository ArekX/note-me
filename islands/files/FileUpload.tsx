import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";

interface FileUploadProps {
    onFilesSelected?: (files: File[]) => Promise<void>;
}

export default function FileUpload({
    onFilesSelected,
}: FileUploadProps) {
    const handleFileChange = async (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.target as HTMLInputElement;

        if (target.files === null) {
            return;
        }

        const files = Array.from(target.files);

        if (files.length > 0) {
            await onFilesSelected?.(files);
        }

        target.value = "";
    };

    const handleAbort = (event: Event) => {
        event.stopPropagation();
    };

    return (
        <>
            <Button
                addClass="relative inline-block"
                size="sm"
                title="Upload files..."
            >
                <div class="flex justify-center items-center w-full">
                    <Icon name="cloud-upload" />
                    <div class="pl-2">Upload</div>
                </div>
                <input
                    class="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer"
                    type="file"
                    title="Upload files..."
                    multiple
                    onChange={handleFileChange}
                    onAbort={handleAbort}
                    onCancel={handleAbort}
                />
            </Button>
        </>
    );
}
