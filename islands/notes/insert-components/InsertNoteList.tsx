import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import GroupPicker from "$islands/GroupPicker.tsx";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { useSignal } from "@preact/signals";
import NoteList from "$islands/notes/blocks/NoteList.tsx";

const Component = ({
    onCancel,
    onInsert,
}: InsertComponentProps) => {
    const selectedGroup = useSignal<TreeRecord | null>(null);

    const handleInsert = () => {
        if (selectedGroup.value === null) {
            return;
        }
        onInsert(`{:note-list|${selectedGroup.value?.id}}`);
        onCancel();
    };

    return (
        <>
            <div class="flex">
                <div class="w-1/4">
                    <div class="pt-2 pb-2">List notes from this group:</div>
                    <GroupPicker
                        allowRoot={true}
                        selectedId={selectedGroup.value?.id}
                        onPick={(group) => selectedGroup.value = group}
                    />
                </div>
                <div class="w-3/4 pl-2 pr-2">
                    <div class="pt-2 pb-2">List will look like this:</div>
                    {selectedGroup.value !== null
                        ? (
                            <NoteList
                                groupId={selectedGroup.value.id}
                                allowLinks={false}
                            />
                        )
                        : <div>Select a group to see the note list.</div>}
                </div>
            </div>
            <div class="mt-2 flex items-center">
                <div class="mr-2">
                    <Button color="primary" size="md" onClick={handleInsert}>
                        <Icon name="list-ul" size="lg" /> Insert
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
        </>
    );
};

export const InsertNoteListDef: InsertComponent<"note-list"> = {
    id: "note-list",
    name: "Note List",
    component: Component,
};
