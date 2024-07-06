import { useSignal } from "@preact/signals";
import { ComponentChildren } from "preact";

export interface FileDropAreaProps {
    onFilesDropped: (files: File[]) => Promise<void>;
    children?: ComponentChildren;
    wrapperClass?: string;
}

export function FileDropWrapper({
    onFilesDropped,
    wrapperClass = "",
    children,
}: FileDropAreaProps) {
    const isDroppingFile = useSignal(false);

    const handleDragOver = (e: DragEvent) => {
        if (!e.dataTransfer) {
            return;
        }

        e.preventDefault();
        isDroppingFile.value = true;
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        isDroppingFile.value = false;
    };

    const handleDrop = async (e: DragEvent) => {
        e.preventDefault();

        if (!e.dataTransfer) {
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        await onFilesDropped(files);
        isDroppingFile.value = false;
    };

    return (
        <div
            class={`${wrapperClass} relative`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isDroppingFile.value && (
                <div
                    onDragLeave={handleDragLeave}
                    class="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50"
                >
                    <p class="text-white text-2xl">Drop files to upload</p>
                </div>
            )}
            {children}
        </div>
    );
}
