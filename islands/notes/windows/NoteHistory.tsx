import Dialog from "$islands/Dialog.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import SideTabPanel, { PanelItem } from "$islands/SideTabPanel.tsx";
import { useSignal } from "@preact/signals";
import { NoteHistoryMetaRecord } from "$backend/repository/note-history-repository.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import NoItemMessage from "$islands/sidebar/NoItemMessage.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    FindNoteHistoryMessage,
    FindNoteHistoryResponse,
    NoteFrontendResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useEffect } from "preact/hooks";
import TimeAgo from "$components/TimeAgo.tsx";
import Button from "$components/Button.tsx";
import Pagination from "$islands/Pagination.tsx";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import HistoryRecordView, {
    ViewType,
} from "$islands/notes/windows/components/HistoryRecordView.tsx";
import Icon from "$components/Icon.tsx";

export default function NoteHistory(
    { noteId, onClose, record }: NoteWindowComponentProps,
) {
    const { page, total, perPage, results, setPagedData } = usePagedData<
        PanelItem<NoteHistoryMetaRecord>
    >();

    const selectedItemIndex = useSignal<number | null>(0);

    const isMobileSidePanelOpen = useSignal(false);

    const historyLoader = useLoader(true);

    const initialView = useSignal<ViewType>("preview");

    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                deleteHistoryRecordResponse: () => {
                    loadNoteHistory();
                },
            },
        },
    });

    const loadNoteHistory = historyLoader.wrap(async () => {
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

        const { results: historyMeta, ...rest } = response.records;

        setPagedData({
            ...rest,
            results: historyMeta.map((history) => ({
                name: (
                    <>
                        {history.version}
                    </>
                ),
                subtitle: (
                    <span>
                        <Icon className="ml-1" name="time" size="sm" /> Created
                        {" "}
                        <TimeAgo time={history.created_at} />
                        {history.is_encrypted
                            ? (
                                <span class="max-xl:block max-xl:ml-1">
                                    <Icon
                                        className="xl:ml-2"
                                        name="lock"
                                        size="sm"
                                    />{" "}
                                    Protected
                                </span>
                            )
                            : null}
                    </span>
                ),
                data: history,
                icon: "history",
                component: () => (
                    <HistoryRecordView
                        record={history}
                        noteRecord={record}
                        noteId={noteId}
                        onClose={onClose}
                        onSidePanelOpen={() =>
                            isMobileSidePanelOpen.value = !isMobileSidePanelOpen
                                .value}
                        initialView={initialView.value}
                        onViewChange={(view) => initialView.value = view}
                    />
                ),
            })),
        });

        selectedItemIndex.value = 0;
    });

    const handlePageChanged = async (newPage: number) => {
        setPagedData({ page: newPage });
        await loadNoteHistory();
    };

    useEffect(() => {
        loadNoteHistory();
    }, []);

    return (
        <Dialog
            visible={true}
            canCancel={true}
            onCancel={onClose}
            props={{
                class: "w-5/6 max-md:w-full",
            }}
            title="History"
        >
            {historyLoader.running
                ? (
                    <div
                        class="flex justify-center items-center"
                        style={{ height: "calc(100vh - 208px)" }}
                    >
                        <Loader />
                    </div>
                )
                : (
                    results.value.length === 0
                        ? (
                            <NoItemMessage
                                icon="history"
                                message="No history found."
                            />
                        )
                        : (
                            <SideTabPanel
                                selectedIndex={selectedItemIndex.value!}
                                items={results.value}
                                isMobileSidePanelOpen={isMobileSidePanelOpen
                                    .value}
                                onSelect={(_, index) => {
                                    selectedItemIndex.value = index;
                                    isMobileSidePanelOpen.value = false;
                                }}
                                styleProps={{
                                    height: "calc(100vh - 208px)",
                                }}
                            />
                        )
                )}

            <div class="flex flex-wrap items-center mt-4">
                <div class="basis-3/5 max-md:basis-full text-left ">
                    <Pagination
                        currentPage={page.value}
                        perPage={perPage.value}
                        total={total.value}
                        onChange={handlePageChanged}
                        alignmentClass="justify-start"
                    />
                </div>
                <div class="basis-2/5 max-md:basis-full text-right md:pr-1.5 max-md:py-4">
                    <Button onClick={onClose} color="primary">
                        Close
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
