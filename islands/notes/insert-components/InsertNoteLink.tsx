import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";

const Component = ({}: InsertComponentProps) => {
    return (
        <div>
            InsertNoteLink
        </div>
    );
};

export const InsertNoteLinkDef: InsertComponent = {
    name: "Note Link",
    component: Component,
};
