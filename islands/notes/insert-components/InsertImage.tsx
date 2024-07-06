import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import LinkForm from "$islands/notes/insert-components/LinkForm.tsx";
import { getImageMarkdown } from "$islands/notes/helpers/markdown.ts";

const Component = ({
    onCancel,
    onInsert,
}: InsertComponentProps) => {
    return (
        <LinkForm
            iconName="image"
            onCancel={onCancel}
            onInsert={(name, url) => onInsert(getImageMarkdown(url, name))}
        />
    );
};

export const InsertImageDef: InsertComponent<"image"> = {
    id: "image",
    name: "Image",
    component: Component,
};
