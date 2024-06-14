import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import FilePicker from "$islands/files/FilePicker.tsx";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";

const Component = ({
    onCancel,
}: InsertComponentProps) => {
    return (
        <div class="w-full">
            <FilePicker color="white" />
            <div>
                <Button color="success" size="sm">
                    <Icon name="link-alt" /> Insert View Link
                </Button>{" "}
                <Button color="success" size="sm">
                    <Icon name="down-arrow-alt" /> Insert Download Link
                </Button>{" "}
                <Button
                    color="danger"
                    onClick={onCancel}
                    size="sm"
                >
                    <Icon name="minus-circle" /> Cancel
                </Button>
            </div>
            <FilePicker color="white" />
        </div>
    );
};

export const InsertFileDef: InsertComponent = {
    name: "File",
    component: Component,
};
