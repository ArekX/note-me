import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";

const Component = ({}: InsertComponentProps) => {
    return (
        <div>
            InsertFile
        </div>
    );
};

export const InsertFileDef: InsertComponent = {
    name: "File",
    component: Component,
};
