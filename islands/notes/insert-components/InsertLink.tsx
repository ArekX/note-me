import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import LinkForm, {
    LinkFormInsertData,
} from "$islands/notes/insert-components/LinkForm.tsx";
import { getLinkMarkdown } from "$islands/notes/helpers/markdown.ts";

const Component = (
    props: InsertComponentProps<LinkFormInsertData>,
) => {
    return <LinkForm {...props} />;
};

export const InsertLinkDef: InsertComponent<
    "link",
    "link",
    LinkFormInsertData
> = {
    id: "link",
    name: "Link",
    component: Component,
    icon: "link",
    description: "Insert a link",
    insertButtons: {
        link: {
            name: "Insert",
            icon: "link",
            formatData: (data) => getLinkMarkdown(data.url, data.name),
        },
    },
};
