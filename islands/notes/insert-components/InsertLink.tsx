import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";

const Component = ({}: InsertComponentProps) => {
    return (
        <div>
            InsertLink
        </div>
    );
};

export const InsertLinkDef: InsertComponent = {
    name: "Link",
    component: Component,
};
