import { ReadonlySignal, useComputed, useSignal } from "@preact/signals";
import {
    NoteSearchRecord,
    SearchNoteFilters,
} from "$backend/repository/note-search-repository.ts";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";
import {
    SearchNoteMessage,
    SearchNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { LoaderHook, useLoader } from "$frontend/hooks/use-loader.ts";

export interface SearchStateHook {
    type: ReadonlySignal<SearchNoteFilters["type"]>;
    query: ReadonlySignal<string>;
    groupRecord: ReadonlySignal<TreeRecord | null>;
    tags: ReadonlySignal<string[]>;
    isActive: ReadonlySignal<boolean>;
    hasMoreData: ReadonlySignal<boolean>;
    results: ReadonlySignal<NoteSearchRecord[]>;
    loader: LoaderHook;
    resetSearch: () => void;
    setQuery: (newQuery: string) => void;
    setType: (newType: SearchNoteFilters["type"]) => void;
    setGroup: (newGroup: TreeRecord | null) => void;
    setTags: (newTags: string[]) => void;
    loadMore: () => void;
}

export const useSearchState = (): SearchStateHook => {
    const type = useSignal<SearchNoteFilters["type"]>("general");
    const query = useSignal<string>("");
    const groupRecord = useSignal<TreeRecord | null>(null);
    const tags = useSignal<string[]>([]);
    const fromId = useSignal<number | undefined>(undefined);
    const results = useSignal<NoteSearchRecord[]>([]);
    const hasMoreData = useSignal<boolean>(true);

    const loader = useLoader();

    const { sendMessage } = useWebsocketService();

    const performSearch = useDebouncedCallback(async () => {
        if (!hasMoreData.value) {
            loader.stop();
            return;
        }

        const response = await sendMessage<
            SearchNoteMessage,
            SearchNoteResponse
        >(
            "notes",
            "searchNote",
            {
                data: {
                    filters: {
                        type: type.value,
                        query: query.value,
                        group_id: groupRecord.value?.id,
                        tags: tags.value,
                        from_id: fromId.value,
                    },
                },
                expect: "searchNoteResponse",
            },
        );

        results.value = [...results.value, ...response.records];

        if (response.records.length < 10) {
            hasMoreData.value = false;
        }

        fromId.value = response.records[response.records.length - 1]?.id;
        loader.stop();
    });

    const isActive = useComputed(() =>
        query.value.length > 0 || groupRecord.value !== null ||
        tags.value.length > 0
    );

    const resetSearch = () => {
        query.value = "";
        groupRecord.value = null;
        tags.value = [];
        hasMoreData.value = true;
        fromId.value = undefined;
        results.value = [];
    };

    const runSearchFromStart = () => {
        results.value = [];
        hasMoreData.value = true;
        fromId.value = undefined;
        loader.start();
        performSearch();
    };

    const setQuery = (
        newQuery: string,
    ) => {
        query.value = newQuery;
        runSearchFromStart();
    };

    const setType = (newType: SearchNoteFilters["type"]) => {
        type.value = newType;
        resetSearch();
    };

    const setGroup = (newGroup: TreeRecord | null) => {
        groupRecord.value = newGroup;
        runSearchFromStart();
    };

    const setTags = (newTags: string[]) => {
        tags.value = newTags;
        runSearchFromStart();
    };

    const loadMore = () => {
        if (hasMoreData.value) {
            performSearch();
        }
    };

    return {
        type,
        query,
        groupRecord,
        tags,
        isActive,
        hasMoreData,
        results,
        loader,
        resetSearch,
        setQuery,
        setType,
        setGroup,
        setTags,
        loadMore,
    };
};
