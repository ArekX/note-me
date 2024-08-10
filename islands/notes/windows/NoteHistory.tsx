import Dialog from "$islands/Dialog.tsx";
import Loader from "$islands/Loader.tsx";
import Button from "$components/Button.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import {
    DeleteHistoryRecordMessage,
    DeleteHistoryRecordResponse,
    FindNoteHistoryMessage,
    FindNoteHistoryResponse,
    RevertNoteToHistoryMessage,
    RevertNoteToHistoryResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Pagination from "$islands/Pagination.tsx";
import {
    NoteHistoryMetaRecord,
} from "$backend/repository/note-history-repository.ts";
import HistoryDiff, {
    ShowNoteType,
} from "$islands/notes/windows/components/HistoryDiff.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import { addMessage } from "$frontend/toast-message.ts";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import Icon from "$components/Icon.tsx";
import TimeAgo from "$components/TimeAgo.tsx";

export default function NoteHistory(
    { noteId, onClose, record }: NoteWindowComponentProps,
) {
    const {
        sendMessage,
    } = useWebsocketService();

    const listLoader = useLoader();

    const { page, total, perPage, results, setPagedData } = usePagedData<
        NoteHistoryMetaRecord
    >();

    const selected = useSignal<NoteHistoryMetaRecord | null>(null);
    const confirmRevert = useSignal<boolean>(false);
    const confirmDelete = useSignal<boolean>(false);
    const showType = useSignal<ShowNoteType>("note");

    const loadNoteHistory = listLoader.wrap(async () => {
        const response = await sendMessage<
            FindNoteHistoryMessage,
            FindNoteHistoryResponse
        >(
            "notes",
            "findNoteHistory",
            {
                data: {
                    note_id: noteId,
                    page: page.value,
                },
                expect: "findNoteHistoryResponse",
            },
        );

        setPagedData(response.records);
    });

    const handlePageChanged = async (page: number) => {
        setPagedData({ page });
        await loadNoteHistory();
    };

    const handlePerformRevert = async () => {
        await sendMessage<
            RevertNoteToHistoryMessage,
            RevertNoteToHistoryResponse
        >("notes", "revertNoteToHistory", {
            data: {
                note_id: noteId,
                to_history_id: selected.value!.id,
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
                id: selected.value!.id,
                note_id: noteId,
            },
            expect: "deleteHistoryRecordResponse",
        });

        await loadNoteHistory();

        selected.value = null;

        confirmDelete.value = false;
    };

    useEffect(() => {
        loadNoteHistory();
    }, [noteId]);

    return (
        <>
            <Dialog
                visible={true}
                canCancel={true}
                onCancel={onClose}
                props={{
                    class: "w-3/4",
                }}
                title="History"
            >
                {listLoader.running ? <Loader color="white" /> : (
                    <div>
                        {total.value === 0 && (
                            <div class="text-center">
                                No history records available for this note.
                            </div>
                        )}
                        {total.value > 0 && (
                            <div class="flex w-full">
                                <div class="w-1/5 pr-2">
                                    <div>
                                        <strong>Versions</strong>
                                    </div>
                                    {results.value.map((record) => (
                                        <div class="mt-4">
                                            <Button
                                                color={selected.value?.id ===
                                                        record.id
                                                    ? "success"
                                                    : "primary"}
                                                addClass="block w-full"
                                                onClick={() =>
                                                    selected.value = record}
                                            >
                                                {record.version}
                                                <span class="text-xs block">
                                                    {record.is_encrypted
                                                        ? (
                                                            <Icon
                                                                name="lock-alt"
                                                                size="sm"
                                                                type="solid"
                                                                className="mr-1"
                                                            />
                                                        )
                                                        : null}
                                                    <TimeAgo
                                                        time={record.created_at}
                                                    />
                                                </span>
                                            </Button>
                                        </div>
                                    ))}
                                    <div class="mt-2">
                                        <Pagination
                                            currentPage={page.value}
                                            perPage={perPage.value}
                                            total={total.value}
                                            onChange={handlePageChanged}
                                        />
                                    </div>
                                </div>

                                {selected.value
                                    ? (
                                        <div class="w-4/5">
                                            <div class="mb-4 flex justify-between">
                                                <Button
                                                    color={showType.value ===
                                                            "note"
                                                        ? "success"
                                                        : "primary"}
                                                    onClick={() =>
                                                        showType.value = "note"}
                                                    addClass="mr-2"
                                                >
                                                    Note
                                                </Button>
                                                <Button
                                                    color={showType.value ===
                                                            "diff"
                                                        ? "success"
                                                        : "primary"}
                                                    onClick={() =>
                                                        showType.value = "diff"}
                                                    addClass="mr-2"
                                                >
                                                    Diff from Current
                                                </Button>

                                                <Button
                                                    color="warning"
                                                    onClick={() =>
                                                        confirmRevert.value =
                                                            true}
                                                    addClass="mr-2"
                                                >
                                                    Revert to this Version
                                                </Button>

                                                <Button
                                                    color="danger"
                                                    onClick={() =>
                                                        confirmDelete.value =
                                                            true}
                                                    addClass="mr-2"
                                                >
                                                    Delete
                                                </Button>
                                            </div>

                                            <HistoryDiff
                                                id={selected.value.id}
                                                noteText={record.text}
                                                showType={showType.value}
                                            />
                                        </div>
                                    )
                                    : (
                                        <div class="w-4/5">
                                            <div class="text-center mt-4">
                                                Select a version to view its
                                                details.
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                )}
                <div class="mt-2 text-right">
                    <Button color="primary" onClick={onClose}>Close</Button>
                </div>
            </Dialog>
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
        </>
    );
}
