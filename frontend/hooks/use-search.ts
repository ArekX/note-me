import { computed, signal } from "@preact/signals";
import {
    DeletedNoteRecord,
    NoteSearchRecord,
    ReminderNoteRecord,
    SearchNoteFilters,
    TreeRecord,
    UserSharedNoteMeta,
} from "$db";
import {
    NoteFrontendResponse,
    SearchNoteMessage,
    SearchNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";

import { useMobileMenu } from "$frontend/hooks/use-mobile-menu.ts";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";

type NoteSearchResult =
    | NoteSearchRecord
    | ReminderNoteRecord
    | UserSharedNoteMeta
    | DeletedNoteRecord;

const type = signal<SearchNoteFilters["type"]>("general");
const query = signal<string>("");
const groupRecord = signal<TreeRecord | null>(null);
const tags = signal<string[]>([]);
const fromId = signal<number | undefined>(undefined);
const results = signal<NoteSearchResult[]>([]);
const hasMoreData = signal<boolean>(true);
const isRunning = signal<boolean>(false);
const isActive = computed(() =>
    query.value.length > 0 || groupRecord.value !== null ||
    tags.value.length > 0
);
let timeoutId = 0;

export const useSearch = () => {
    const mobileMenu = useMobileMenu();
    const responsiveQuery = useResponsiveQuery();

    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                createNoteResponse: () => reload(),
                updateNoteResponse: () => reload(),
                deleteNoteResponse: () => reload(),
                restoreDeletedNoteResponse: () => reload(),
                setReminderResponse: () => reload(),
                removeReminderResponse: () => reload(),
                fullyDeleteNoteResponse: () => reload(),
            },
        },
    });

    const runDebouncedSearch = async () => {
        if (isRunning.value || !isActive.value) {
            return;
        }

        if (responsiveQuery.isMobile()) {
            mobileMenu.open();
        }

        isRunning.value = true;

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

        if (!isActive.value) {
            isRunning.value = false;
            return;
        }

        if (response.results.length < 10) {
            hasMoreData.value = false;
        }

        results.value = [...results.value, ...response.results];
        fromId.value = response.results[response.results.length - 1]?.id;
        isRunning.value = false;
    };

    const performSearch = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(runDebouncedSearch, 250);
    };

    const resetSearch = () => {
        query.value = "";
        groupRecord.value = null;
        tags.value = [];
        hasMoreData.value = true;
        fromId.value = undefined;
        results.value = [];
    };

    const reload = () => {
        if (isRunning.value) {
            return;
        }

        if (isActive.value) {
            results.value = [];
            hasMoreData.value = true;
            fromId.value = undefined;
            performSearch();
        }
    };

    const setQuery = (
        newQuery: string,
    ) => {
        query.value = newQuery;
        reload();
    };

    const setType = (newType: SearchNoteFilters["type"]) => {
        type.value = newType;
        resetSearch();
        performSearch();
    };

    const setGroup = (newGroup: TreeRecord | null) => {
        groupRecord.value = newGroup;
        reload();
    };

    const setTags = (newTags: string[]) => {
        tags.value = newTags;
        reload();
    };

    const loadMore = () => {
        if (!isRunning.value && hasMoreData.value) {
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
        reload,
        loadMore,
    };
};
