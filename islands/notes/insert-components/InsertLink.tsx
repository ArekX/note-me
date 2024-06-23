import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import LinkForm from "$islands/notes/insert-components/LinkForm.tsx";

const Component = ({
    onCancel,
    onInsert,
}: InsertComponentProps) => {
    return (
        <LinkForm
            iconName="link"
            onCancel={onCancel}
            onInsert={(name, url) => onInsert(`[${name}](${url})`)}
        />
    );
};

export const InsertLinkDef: InsertComponent<"link"> = {
    id: "link",
    name: "Link",
    component: Component,
};
