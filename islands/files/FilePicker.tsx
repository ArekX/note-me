import FileUpload from "$islands/files/FileUpload.tsx";

export interface PickedFile {
    name: string;
}

interface FilePickerProps {
    onFilePicked?: (file: PickedFile) => void;
}

export default function FilePicker(_props: FilePickerProps) {
    return (
        <div class="w-52">
            FilePicker

            <FileUpload />
        </div>
    );
}
