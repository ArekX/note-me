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
        <TableOfContents
            text={noteText}
            disableLinks={true}
            noTocMessage="No headings found in this note to create table of contents, pleaase add headings to see the ToC here."
        />
    );
};

export const InsertTocDef: InsertComponent<"toc", "toc", InsertTocData> = {
    id: "toc",
    name: "Table of Contents",
    component: Component,
    icon: "list-ul",
    description: "Insert a dynamic ToC generated from headings",
    insertButtons: {
        toc: {
            name: "Insert",
            icon: "list-ul",
            formatData: () => "{:table-of-contents}",
        },
    },
};
