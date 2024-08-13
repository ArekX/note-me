import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import GroupPicker from "../../groups/GroupPicker.tsx";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { useSignal } from "@preact/signals";
import NoteList from "$islands/notes/blocks/NoteList.tsx";

interface InsertNoteListData {
    groupId: number;
}

const Component = ({
    onInsertDataChange,
}: InsertComponentProps<InsertNoteListData>) => {
    const selectedGroup = useSignal<TreeRecord | null>(null);

    const handleSelectGroup = (group: TreeRecord) => {
        selectedGroup.value = group;
        onInsertDataChange({ groupId: group.id });
    };

    return (
        <>
            <div class="py-2">
                Please select a group to display a list of notes from. This list
                will be dynamically updated as notes are added or removed.
            </div>
            <div class="flex">
                <div class="w-1/4">
                    <div class="py-2 font-semibold">Group</div>
                    <GroupPicker
                        allowRoot={true}
                        selectedId={selectedGroup.value?.id}
                        onPick={handleSelectGroup}
                    />
                </div>
                <div class="w-3/4 pl-2 pr-2">
                    <div class="py-2 font-semibold">List Preview</div>
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
        </>
    );
};

export const InsertNoteListDef: InsertComponent<
    "note-list",
    "list",
    InsertNoteListData
> = {
    id: "note-list",
    name: "Note List",
    component: Component,
    icon: "list-ul",
    description: "Insert a dynamic note list from a group",
    insertButtons: {
        list: {
            name: "List",
            icon: "list-ul",
            formatData: (data) => `{:note-list|${data.groupId}}`,
        },
    },
};
