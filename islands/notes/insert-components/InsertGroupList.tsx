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

export const InsertGroupListDef: InsertComponent = {
    name: "Group List",
    component: Component,
};
