import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";

const Component = ({}: InsertComponentProps) => {
    return (
        <div>
            TODO: This needs search capabilities
        </div>
    );
};

export const InsertNoteLinkDef: InsertComponent<"note-link"> = {
    id: "note-link",
    name: "Note Link",
    component: Component,
};
