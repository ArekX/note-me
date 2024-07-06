import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import LinkForm from "$islands/notes/insert-components/LinkForm.tsx";
import { getLinkMarkdown } from "$islands/notes/helpers/markdown.ts";

const Component = ({
    onCancel,
    onInsert,
}: InsertComponentProps) => {
    return (
        <LinkForm
            iconName="link"
            onCancel={onCancel}
            onInsert={(name, url) => onInsert(getLinkMarkdown(url, name))}
        />
    );
};

export const InsertLinkDef: InsertComponent<"link"> = {
    id: "link",
    name: "Link",
    component: Component,
};
