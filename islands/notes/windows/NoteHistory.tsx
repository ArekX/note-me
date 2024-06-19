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
import HistoryDiff from "$islands/notes/windows/components/HistoryDiff.tsx";

interface NoteHistoryProps {
    noteId: number;
    onClose: () => void;
}

export default function NoteDetails(
    { noteId, onClose }: NoteHistoryProps,
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
                    <div class="flex">
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
                                onChange={() => {}}
                            />
                        </div>
                        <div class="w-4/5">
                            <div class="mb-2">
                                <strong>Diff</strong>
                            </div>
                            {selected.value && (
                                <HistoryDiff id={selected.value.id} />
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div class="mt-2 text-right">
                <Button color="danger" onClick={onClose}>Close</Button>
            </div>
        </Dialog>
    );
}
