import {
    NoteHistoryDataRecord,
    NoteHistoryMetaRecord,
} from "$backend/repository/note-history-repository.ts";
import { NoteRecord } from "$islands/notes/NoteWindow.tsx";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteHistoryRecordMessage,
    DeleteHistoryRecordResponse,
    GetNoteHistoryDataMessage,
    GetNoteHistoryDataResponse,
    RevertNoteToHistoryMessage,
    RevertNoteToHistoryResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { addMessage } from "$frontend/toast-message.ts";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import ButtonGroup from "$components/ButtonGroup.tsx";
import { useListState } from "$frontend/hooks/use-list-state.ts";
import Button from "$components/Button.tsx";
import ViewNote from "$islands/notes/ViewNote.tsx";
import { useEffect } from "preact/hooks";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import LockedContentWrapper from "$islands/encryption/LockedContentWrapper.tsx";
import { tagsToString } from "$frontend/tags.ts";
import TextDiff from "$islands/TextDiff.tsx";

export type ViewType = "preview" | "note" | "diff";

interface HistoryRecordViewProps {
    record: NoteHistoryMetaRecord;
    noteId: number;
    noteRecord: NoteRecord;
    initialView: ViewType;
    onClose: () => void;
    onViewChange?: (view: ViewType) => void;
}

export default function HistoryRecordView(
    { record, noteId, noteRecord, onClose, initialView, onViewChange }:
        HistoryRecordViewProps,
) {
    const confirmRevert = useSignal<boolean>(false);
    const confirmDelete = useSignal<boolean>(false);
    const loader = useLoader(true);

    const { items, selectItem, selected } = useListState({
        preview: "Note view",
        note: "Markdown view",
        diff: "Diff from current note",
    }, initialView);

    const { sendMessage } = useWebsocketService();

    const handlePerformRevert = async () => {
        await sendMessage<
            RevertNoteToHistoryMessage,
            RevertNoteToHistoryResponse
        >("notes", "revertNoteToHistory", {
            data: {
                note_id: noteId,
                to_history_id: record.id,
            },
            expect: "revertNoteToHistoryResponse",
        });

        addMessage({
            type: "success",
            text: "Note has been reverted successfully.",
        });

        confirmRevert.value = false;

        onClose();
    };

    const handlePerformDelete = async () => {
        await sendMessage<
            DeleteHistoryRecordMessage,
            DeleteHistoryRecordResponse
        >("notes", "deleteHistoryRecord", {
            data: {
                id: record.id,
                note_id: noteId,
            },
            expect: "deleteHistoryRecordResponse",
        });

        confirmDelete.value = false;
    };

    const historyRecord = useSignal<NoteHistoryDataRecord | null>(null);

    const loadHistoryData = loader.wrap(async () => {
        const response = await sendMessage<
            GetNoteHistoryDataMessage,
            GetNoteHistoryDataResponse
        >(
            "notes",
            "getNoteHistoryData",
            {
                data: {
                    id: record.id,
                },
                expect: "getNoteHistoryDataResponse",
            },
        );

        historyRecord.value = response.data;
    });

    useEffect(() => {
        loadHistoryData();
    }, [record.id]);

    const handleSelectItem = (item: ViewType) => {
        selectItem(item);
        onViewChange?.(item);
    };

    if (loader.running || !historyRecord.value) {
        return <Loader color="white" />;
    }

    return (
        <div>
            <div class="flex">
                <div class="basis-3/5">
                    <ButtonGroup
                        items={items}
                        activeItem={selected.value}
                        onSelect={handleSelectItem}
                    />
                </div>
                <div class="basis-2/5 text-right">
                    <Button
                        color="warning"
                        onClick={() => confirmRevert.value = true}
                        addClass="mr-2"
                    >
                        Revert to this Version
                    </Button>

                    <Button
                        color="danger"
                        onClick={() => confirmDelete.value = true}
                        addClass="mr-2"
                    >
                        Delete
                    </Button>
                </div>
            </div>

            <div class="pt-2 bg-gray-900 absolute top-14 left-5 right-2 bottom-0 overflow-auto border border-gray-700 border-b-0 rounded-lg">
                <div class="p-5">
                    <LockedContentWrapper
                        inputRecords={[historyRecord.value]}
                        protectedKeys={["note"]}
                        isLockedKey={"is_encrypted"}
                        unlockRender={(
                            { unlockedRecords: [unlockedRecord] },
                        ) => {
                            historyRecord.value = unlockedRecord;

                            const tags = unlockedRecord.tags.length > 0
                                ? unlockedRecord.tags.split(",")
                                : [];

                            if (selected.value === "note") {
                                return (
                                    <div>
                                        <div class="text-2xl py-4">
                                            {unlockedRecord.title}
                                        </div>
                                        <div class="text-xl py-2">
                                            {tagsToString(tags)}
                                        </div>
                                        <pre class="py-4">
                                            {unlockedRecord.note}
                                        </pre>
                                    </div>
                                );
                            }

                            if (selected.value === "diff") {
                                return (
                                    <TextDiff
                                        text1={unlockedRecord.note}
                                        text2={noteRecord.text}
                                    />
                                );
                            }

                            return (
                                <ViewNote
                                    record={{
                                        id: noteId,
                                        note: unlockedRecord.note,
                                        title: unlockedRecord.title,
                                        tags: tags,
                                        updated_at: record.created_at,
                                        group_id: null,
                                        group_name: "",
                                        is_encrypted: false,
                                    }}
                                    disableTagLinks={true}
                                    readonly={true}
                                    historyMode={true}
                                    shareMode="everyone"
                                />
                            );
                        }}
                    />
                </div>
            </div>

            <ConfirmDialog
                visible={confirmRevert.value}
                prompt="Are you sure that you want to revert to this version? Current note will be saved as another version."
                onConfirm={handlePerformRevert}
                confirmText="Revert to this version"
                confirmColor="warning"
                onCancel={() => confirmRevert.value = false}
            />
            <ConfirmDialog
                visible={confirmDelete.value}
                prompt="Are you sure that you want to delete this version? This action cannot be undone."
                onConfirm={handlePerformDelete}
                confirmText="Delete this version"
                confirmColor="danger"
                onCancel={() => confirmDelete.value = false}
            />
        </div>
    );
}
