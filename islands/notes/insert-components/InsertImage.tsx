import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import LinkForm, {
    LinkFormInsertData,
} from "$islands/notes/insert-components/LinkForm.tsx";
import { getImageMarkdown } from "$islands/notes/helpers/markdown.ts";

const Component = (
    props: InsertComponentProps<LinkFormInsertData>,
) => {
    return <LinkForm {...props} />;
};

export const InsertImageDef: InsertComponent<
    "image",
    "image",
    LinkFormInsertData
> = {
    id: "image",
    name: "Image",
    component: Component,
    icon: "image",
    description: "Insert an image from a URL",
    insertButtons: {
        image: {
            name: "Insert",
            icon: "image",
            formatData: (data) => getImageMarkdown(data.url, data.name),
        },
    },
};
