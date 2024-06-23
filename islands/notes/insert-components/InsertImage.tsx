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
            iconName="image"
            onCancel={onCancel}
            onInsert={(name, url) => onInsert(`![${name}](${url})`)}
        />
    );
};

export const InsertImageDef: InsertComponent<"image"> = {
    id: "image",
    name: "Image",
    component: Component,
};
