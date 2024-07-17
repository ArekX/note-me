import { computed, signal } from "@preact/signals";
import {
    NoteSearchRecord,
    SearchNoteFilters,
} from "$backend/repository/note-search-repository.ts";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";
import {
    SearchNoteMessage,
    SearchNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";

const type = signal<SearchNoteFilters["type"]>("general");
const query = signal<string>("");
const groupRecord = signal<TreeRecord | null>(null);
const tags = signal<string[]>([]);
const fromId = signal<number | undefined>(undefined);
const results = signal<NoteSearchRecord[]>([]);
const hasMoreData = signal<boolean>(true);
const isRunning = signal<boolean>(false);
const isActive = computed(() =>
    query.value.length > 0 || groupRecord.value !== null ||
    tags.value.length > 0
);

export const useSearch = () => {
    const { sendMessage } = useWebsocketService();

    const performSearch = useDebouncedCallback(async () => {
        if (!hasMoreData.value) {
            isRunning.value = false;
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
        isRunning.value = false;
    });

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
        isRunning.value = true;
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
        performSearch();
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
        isRunning,
        resetSearch,
        setQuery,
        setType,
        setGroup,
        setTags,
        loadMore,
    };
};
