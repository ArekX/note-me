import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import TableOfContents from "$islands/notes/blocks/TableOfContents.tsx";
import { useEffect } from "preact/hooks";

interface InsertTocData {
    insertToc: boolean;
}

const Component = ({
    onInsertDataChange,
    noteText,
}: InsertComponentProps<InsertTocData>) => {
    useEffect(() => {
        onInsertDataChange({ insertToc: true });
    }, []);

    return (
        <>
            <div class="py-2 max-md:text-sm">
                Table of contents is generated from the note's content.
                Specifically from the markdown headings. This table of contents
                will be dynamically updated as headings are added or removed in
                the note text.
            </div>
            <div class="font-semibold">
                Preview
            </div>
            <div class="markdown-viewer">
                <TableOfContents
                    text={noteText}
                    disableLinks
                    noTocMessage="No headings found in this note to create table of contents, pleaase add headings to see the ToC here."
                />
            </div>
        </>
    );
};

export const InsertTocDef: InsertComponent<"toc", "toc", InsertTocData> = {
    id: "toc",
    name: "Table of Contents",
    component: Component,
    icon: "list-ul",
    description: "Insert a dynamic Table of Contents",
    insertButtons: {
        toc: {
            name: "Insert",
            icon: "list-ul",
            formatData: () => "{:table-of-contents}",
        },
    },
};
