import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useFilters } from "@/composables/useFilters";
import { useLoadMore } from "@/composables/useLoadMore";
import { useMobileMenu } from "@/composables/useMobileMenu";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import type {
    ChangesFrontendResponse,
    DataEntity,
    NoteFrontendResponse,
    SearchNoteMessage,
    SearchNoteResponse,
} from "@/types/messages";
import type { NoteSearchResult, SearchType } from "@/types/records";
import { useSocketStore } from "./socket";

export interface SearchGroup {
    id: number;
    name: string;
}

interface SearchFilters {
    query: string;
    group: SearchGroup | null;
    tags: string[];
}

export const SEARCH_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 250;

// Shared and reminder searches show other users' notes and reminders fired
// by the server.
const changedEntities: readonly DataEntity[] = ["note", "share", "reminder"];

export const useSearchStore = defineStore("search", () => {
    const type = ref<SearchType>("general");
    const getService = () => useSocketStore().getService();

    const results = useLoadMore<NoteSearchResult>({
        limit: SEARCH_PAGE_SIZE,
        onLoadMore: async (last): Promise<NoteSearchResult[]> => {
            if (useResponsiveQuery().isMobile()) {
                useMobileMenu().open();
            }

            const { query, group, tags } = filters.value;
            const response = await (
                await getService()
            ).sendMessage<SearchNoteMessage, SearchNoteResponse>(
                "notes",
                "searchNote",
                {
                    data: {
                        filters: {
                            type: type.value,
                            query,
                            group_id: group?.id,
                            tags,
                            from_id: last?.id,
                        },
                    },
                    expect: "searchNoteResponse",
                },
            );
            return response.results;
        },
    });

    const isActive = computed(
        () =>
            filters.value.query.length > 0 ||
            filters.value.group !== null ||
            filters.value.tags.length > 0,
    );

    const loadMore = async (): Promise<void> => {
        if (isActive.value) {
            await results.loadMore();
        }
    };

    const { filters, setFilter, setFilters, resetFilters } =
        useFilters<SearchFilters>({
            initialFilters: () => ({ query: "", group: null, tags: [] }),
            onFiltersSet: results.reset,
            onFilterLoad: loadMore,
            debounceTime: SEARCH_DEBOUNCE_MS,
        });

    const reload = () => {
        if (isActive.value) {
            setFilters({});
        }
    };

    const setType = (newType: SearchType) => {
        type.value = newType;
        resetFilters();
    };

    let listening: Promise<void> | null = null;
    const listen = async () => {
        (await getService()).listen<
            NoteFrontendResponse | ChangesFrontendResponse
        >({
            changes: {
                dataChanged: ({ entity }) => {
                    if (changedEntities.includes(entity)) {
                        reload();
                    }
                },
            },
            notes: {
                createNoteResponse: reload,
                updateNoteResponse: reload,
                deleteNoteResponse: reload,
                restoreDeletedNoteResponse: reload,
                fullyDeleteNoteResponse: reload,
                revertNoteToHistoryResponse: reload,
                setReminderResponse: reload,
                removeReminderResponse: reload,
            },
        });
    };
    // The socket manager outlives a logout, so the listener is added once.
    const init = () => (listening ??= listen());

    return {
        type,
        query: computed(() => filters.value.query),
        group: computed(() => filters.value.group),
        tags: computed(() => filters.value.tags),
        isActive,
        results: results.records,
        hasMore: results.hasMore,
        isRunning: results.loader.running,
        init,
        loadMore,
        reload,
        setType,
        setQuery: (query: string) => setFilter("query", query),
        setGroup: (group: SearchGroup | null) => setFilter("group", group),
        setTags: (tags: string[]) => setFilter("tags", tags),
        setFilters,
        resetSearch: resetFilters,
    };
});
