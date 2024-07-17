import { useEffect } from "preact/hooks";
import { SearchStateHook } from "./hooks/use-search-state.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";
import Loader from "$islands/Loader.tsx";
import { useLoadMoreData } from "$frontend/hooks/use-load-more-data.ts";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import TreeItemView from "$islands/sidebar/search/TreeItemView.tsx";
import {
    SearchNoteMessage,
    SearchNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { NoteSearchRecord } from "$backend/repository/note-search-repository.ts";

interface SearchViewProps {
    search: SearchStateHook;
}

export default function SearchView({
    search,
}: SearchViewProps) {
    const searchLoader = useLoader();
    const { sendMessage } = useWebsocketService();
    const {
        records,
        hasMoreData,
        addMoreRecords,
        setNoMoreData,
        resetData,
        getLastRecordKey,
    } = useLoadMoreData<NoteSearchRecord>();

    const performSearch = useDebouncedCallback(async () => {
        const response = await sendMessage<
            SearchNoteMessage,
            SearchNoteResponse
        >(
            "notes",
            "searchNote",
            {
                data: {
                    filters: {
                        ...search.query.value,
                        type: search.type.value,
                        from_id: getLastRecordKey("id"),
                    },
                },
                expect: "searchNoteResponse",
            },
        );

        addMoreRecords(response.records);

        if (response.records.length < 10) {
            setNoMoreData();
        }

        searchLoader.stop();
    });

    useEffect(() => {
        resetData();
        searchLoader.start();
        performSearch();
    }, [search.query.value]);

    return (
        <div class="relative">
            <div class="p-2">
                Search results{" "}
                {searchLoader.running ? "" : `(${records.value.length})`}
            </div>
            {searchLoader.running
                ? (
                    <div class="text-center">
                        <Loader color="white" />
                    </div>
                )
                : (
                    <LoadMoreWrapper
                        addCss="search-view-height"
                        hasMore={hasMoreData.value}
                        onLoadMore={() => performSearch()}
                    >
                        <div>
                            {records.value.map((i, idx) => (
                                <TreeItemView
                                    search={search}
                                    key={idx}
                                    record={i}
                                />
                            ))}
                        </div>
                    </LoadMoreWrapper>
                )}
        </div>
    );
}
