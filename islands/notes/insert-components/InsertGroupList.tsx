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

export const InsertGroupListDef: InsertComponent<"group-list"> = {
    id: "group-list",
    name: "Group List",
    component: Component,
};
