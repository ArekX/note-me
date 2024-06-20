import Dialog from "$islands/Dialog.tsx";
import Loader from "$islands/Loader.tsx";
import Button from "$components/Button.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import {
    FindNoteHistoryMessage,
    FindNoteHistoryResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import Pagination from "$islands/Pagination.tsx";
import {
    NoteHistoryMetaRecord,
} from "$backend/repository/note-history-repository.ts";
import HistoryDiff, {
    ShowNoteType,
} from "$islands/notes/windows/components/HistoryDiff.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";

export default function NoteDetails(
    { noteId, onClose, noteText }: NoteWindowComponentProps,
) {
    const {
        sendMessage,
    } = useWebsocketService();

    const listLoader = useLoader();
    const page = useSignal(1);
    const totalRecords = useSignal(1);
    const perPage = useSignal(10);
    const records = useSignal<NoteHistoryMetaRecord[]>(
        [],
    );
    const selected = useSignal<NoteHistoryMetaRecord | null>(null);
    const showType = useSignal<ShowNoteType>("note");

    const loadNoteHistory = async () => {
        listLoader.start();
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

        perPage.value = response.records.per_page;
        records.value = response.records.results;
        totalRecords.value = response.records.total;
        listLoader.stop();
    };

    const handlePageChanged = async (newPage: number) => {
        page.value = newPage;
        await loadNoteHistory();
    };

    const handlePerformRevert = async () => {
        // TODO: Implement revert
    };

    useEffect(() => {
        loadNoteHistory();
    }, [noteId]);

    return (
        <Dialog
            visible={true}
            props={{
                class: "w-3/4",
            }}
        >
            {listLoader.running ? <Loader color="white" /> : (
                <div>
                    <h1 class="text-2xl pb-4">Note History</h1>
                    <div class="flex w-full">
                        <div class="w-1/5 pr-2">
                            <div>
                                <strong>Versions</strong>
                            </div>
                            {records.value.map((record) => (
                                <div class="mt-2">
                                    <Button
                                        color={selected.value?.id === record.id
                                            ? "success"
                                            : "primary"}
                                        addClass="block w-full"
                                        onClick={() => selected.value = record}
                                    >
                                        {record.version}
                                    </Button>
                                </div>
                            ))}
                            <Pagination
                                currentPage={page.value}
                                perPage={perPage.value}
                                total={totalRecords.value}
                                onChange={handlePageChanged}
                            />
                        </div>
                        {selected.value && (
                            <div class="w-4/5">
                                <div class="mb-4">
                                    <Button
                                        color={showType.value === "note"
                                            ? "success"
                                            : "primary"}
                                        onClick={() => showType.value = "note"}
                                        addClass="mr-2"
                                    >
                                        Note
                                    </Button>
                                    <Button
                                        color={showType.value === "diff"
                                            ? "success"
                                            : "primary"}
                                        onClick={() => showType.value = "diff"}
                                        addClass="mr-2"
                                    >
                                        Diff from Current
                                    </Button>

                                    <Button
                                        color="success"
                                        onClick={handlePerformRevert}
                                        addClass="mr-2"
                                    >
                                        Revert to this Version
                                    </Button>
                                </div>

                                <HistoryDiff
                                    id={selected.value.id}
                                    noteText={noteText}
                                    showType={showType.value}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div class="mt-2 text-right">
                <Button color="danger" onClick={onClose}>Close</Button>
            </div>
        </Dialog>
    );
}
