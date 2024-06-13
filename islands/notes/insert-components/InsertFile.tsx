import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import FilePicker from "$islands/files/FilePicker.tsx";

const Component = ({}: InsertComponentProps) => {
    return (
        <div class="w-full">
            <FilePicker color="white" />
        </div>
    );
};

export const InsertFileDef: InsertComponent = {
    name: "File",
    component: Component,
};
