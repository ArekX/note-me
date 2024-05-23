import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";

const Component = ({}: InsertComponentProps) => {
    return (
        <div>
            InsertGroupList
        </div>
    );
};

export const InsertGroupListDef: InsertComponent = {
    name: "Group List",
    component: Component,
};
