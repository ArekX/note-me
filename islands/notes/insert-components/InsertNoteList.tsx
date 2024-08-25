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
            <div class="py-2 max-md:text-sm">
                Please select a group to display a list of notes from. This list
                will be dynamically updated as notes are added or removed.
            </div>
            <div class="flex flex-wrap">
                <div class="basis-1/4 max-md:basis-full">
                    <div class="py-2 font-semibold">Group</div>
                    <GroupPicker
                        allowRoot={true}
                        selectedId={selectedGroup.value?.id}
                        onPick={handleSelectGroup}
                    />
                </div>
                <div class="basis-3/4 max-md:basis-full max-md:pt-2 md:pl-2 md:pr-2">
                    <div class="py-2 font-semibold">List Preview</div>
                    {selectedGroup.value
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
            name: "Insert List",
            icon: "list-ul",
            formatData: (data) => `{:note-list|${data.groupId}}`,
        },
    },
};
