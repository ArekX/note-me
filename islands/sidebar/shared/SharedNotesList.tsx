import { ComponentChild } from "preact";
import {
    FindSharedNotesMessage,
    FindSharedNotesResponse,
    NoteFrontendResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    UserSharedNoteMeta,
} from "$backend/repository/note-share-repository.ts";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import { useSearch } from "$frontend/hooks/use-search.ts";
import { useLoadMore } from "$frontend/hooks/use-load-more.ts";
import NoItemMessage from "$islands/sidebar/NoItemMessage.tsx";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import SharedNoteItem from "$islands/sidebar/shared/SharedNoteItem.tsx";

interface SharedNotesListProps {
    switcherComponent: ComponentChild;
}

export default function SharedNotesList({
    switcherComponent,
}: SharedNotesListProps) {
    const search = useSearch();

    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                updateNoteResponse: () => reload(),
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
    } = useLoadMore<UserSharedNoteMeta>({
        onLoadMore: async (lastRecord: UserSharedNoteMeta | null) => {
            const { records } = await sendMessage<
                FindSharedNotesMessage,
                FindSharedNotesResponse
            >("notes", "findSharedNotes", {
                data: {
                    filters: {
                        fromCreatedAt: lastRecord?.created_at,
                        fromShareId: lastRecord?.share_id,
                        limit: 5,
                    },
                },
                expect: "findSharedNotesResponse",
            });

            return records;
        },
        limit: 10,
        loaderInitialValue: true,
    });

    useEffect(() => {
        loadMore();
        search.setType("shared");
    }, []);

    return (
        <div>
            {switcherComponent}
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
                                icon="share-alt"
                                message="No notes currently shared with you."
                            />
                        )}
                        <LoadMoreWrapper
                            addCss="search-view-height"
                            hasMore={hasMore.value}
                            onLoadMore={loadMore}
                        >
                            <div>
                                {records.value.map((record) => (
                                    <SharedNoteItem
                                        key={record.share_id}
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
