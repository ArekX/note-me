import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";

const Component = ({}: InsertComponentProps) => {
    return (
        <div>
            InsertImage
        </div>
    );
};

export const InsertImageDef: InsertComponent = {
    name: "Image",
    component: Component,
};
