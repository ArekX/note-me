import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import TableOfContents from "$islands/notes/blocks/TableOfContents.tsx";

const Component = ({
    onCancel,
    onInsert,
    noteText,
}: InsertComponentProps) => {
    const handleInsert = () => {
        onInsert("{:table-of-contents}");
    };

    return (
        <div>
            <TableOfContents text={noteText} />
            <div class="mt-2 flex items-center">
                <div class="mr-2">
                    <Button color="primary" size="md" onClick={handleInsert}>
                        <Icon name="link" size="lg" /> Insert
                    </Button>
                </div>

                <div>
                    <Button
                        color="danger"
                        onClick={onCancel}
                        size="md"
                    >
                        <Icon name="minus-circle" size="lg" /> Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const InsertTocDef: InsertComponent = {
    name: "Table of Contents",
    component: Component,
};
