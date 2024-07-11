import { useEffect } from "preact/hooks";
import { SearchStateHook } from "./hooks/use-search-state.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    FindTreeItemsMessage,
    FindTreeItemsResponse,
} from "$workers/websocket/api/tree/messages.ts";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";
import Loader from "$islands/Loader.tsx";
import { useLoadMoreData } from "$frontend/hooks/use-load-more-data.ts";
import { useSignal } from "@preact/signals";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import TreeItemView from "$islands/sidebar/search/TreeItemView.tsx";

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
    } = useLoadMoreData<TreeRecord>();

    const page = useSignal(1);

    const performSearch = useDebouncedCallback(async () => {
        const response = await sendMessage<
            FindTreeItemsMessage,
            FindTreeItemsResponse
        >(
            "tree",
            "findTreeItems",
            {
                data: {
                    filter: {
                        search: search.request.value.type === "simple"
                            ? search.request.value.query
                            : undefined,
                    },
                    page: page.value,
                },
                expect: "findTreeItemsResponse",
            },
        );

        addMoreRecords(response.records.results);

        if (response.records.results.length === 0) {
            setNoMoreData();
        }

        searchLoader.stop();
    });

    useEffect(() => {
        page.value = 1;
        resetData();
        searchLoader.start();
        performSearch();
    }, [search.request.value]);

    return (
        <div class="relative">
            <div class="p-2">
                Search results{" "}
                {searchLoader.running ? "" : `(${records.value.length})`}
            </div>
            {searchLoader.running ? <Loader color="white" /> : (
                <LoadMoreWrapper
                    addCss="search-view-height"
                    hasMore={hasMoreData.value}
                    onLoadMore={() => {
                        page.value++;
                        performSearch();
                    }}
                >
                    <div>
                        {records.value.map((i, idx) => (
                            <TreeItemView
                                searchQuery={search.request.value}
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
