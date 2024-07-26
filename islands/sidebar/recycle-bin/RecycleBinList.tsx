import { ComponentChild } from "preact";
import Loader from "$islands/Loader.tsx";
import NoItemMessage from "$islands/sidebar/NoItemMessage.tsx";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import { useEffect } from "preact/hooks";
import { useSearch } from "$frontend/hooks/use-search.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useLoadMore } from "$frontend/hooks/use-load-more.ts";
import { DeletedNoteRecord } from "$backend/repository/note-repository.ts";
import {
    FindDeletedNotesMessage,
    FindDeletedNotesResponse,
    NoteFrontendResponse,
} from "$workers/websocket/api/notes/messages.ts";
import RecycleBinItem from "$islands/sidebar/recycle-bin/RecycleBinItem.tsx";
import { useTreeWebsocket } from "$islands/tree/hooks/use-tree-websocket.ts";
import { useTreeState } from "$islands/tree/hooks/use-tree-state.ts";
import SwitcherContainer from "$islands/sidebar/SwitcherContainer.tsx";

interface RecycleBinListProps {
    switcherComponent: ComponentChild;
}

export default function RecycleBinList({
    switcherComponent,
}: RecycleBinListProps) {
    const search = useSearch();

    useTreeWebsocket({
        treeState: useTreeState(),
    });

    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                deleteNoteResponse: () => reload(),
                restoreDeletedNoteResponse: () => reload(),
                fullyDeleteNoteResponse: (data) => {
                    records.value = records.value.filter(
                        (r) => r.id !== data.deleted_id,
                    );
                },
            },
        },
    });

    const reload = () => {
        reset();
        loadMore();
    };

    const {
        records,
        hasMore,
        loader,
        reset,
        loadMore,
    } = useLoadMore<DeletedNoteRecord>({
        onLoadMore: async (lastRecord: DeletedNoteRecord | null) => {
            const { records } = await sendMessage<
                FindDeletedNotesMessage,
                FindDeletedNotesResponse
            >("notes", "findDeletedNotes", {
                data: {
                    filters: {
                        fromId: lastRecord?.id ?? 0,
                    },
                },
                expect: "findDeletedNotesResponse",
            });

            return records;
        },
        limit: 10,
        loaderInitialValue: true,
    });

    useEffect(() => {
        loadMore();
        search.setType("recycleBin");
    }, []);

    return (
        <div>
            <SwitcherContainer
                switcherComponent={switcherComponent}
                icons={[
                    {
                        name: "Reload",
                        icon: "refresh",
                        onClick: reload,
                    },
                ]}
            />
            {loader.running
                ? (
                    <div class="text-center">
                        <Loader color="white" />
                    </div>
                )
                : (
                    <>
                        {records.value.length === 0 && (
                            <NoItemMessage
                                icon="recycle"
                                message="You have no deleted notes."
                            />
                        )}
                        <LoadMoreWrapper
                            addCss="search-view-height"
                            hasMore={hasMore.value}
                            onLoadMore={loadMore}
                        >
                            <div>
                                {records.value.map((record, index) => (
                                    <RecycleBinItem
                                        key={index}
                                        record={record}
                                    />
                                ))}
                            </div>
                        </LoadMoreWrapper>
                    </>
                )}
        </div>
    );
}
