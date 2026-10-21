<script setup lang="ts">
import { onMounted, ref } from "vue";
import Input from "@/components/Input.vue";
import LoadMoreWrapper from "@/components/LoadMoreWrapper.vue";
import Skeleton from "@/components/Skeleton.vue";
import NoteItemView from "@/components/sidebar/search/NoteItemView.vue";
import { useDebouncedCallback } from "@/composables/useDebouncedCallback";
import { useLoadMore } from "@/composables/useLoadMore";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { SEARCH_PAGE_SIZE } from "@/stores/search";
import type { SearchNoteMessage, SearchNoteResponse } from "@/types/messages";
import type { NoteSearchRecord } from "@/types/records";

export interface InsertNoteLinkData {
    noteId: number;
}

const props = defineProps<{ initialData?: InsertNoteLinkData }>();
const emit = defineEmits<{ insertDataChange: [data: InsertNoteLinkData] }>();

const { sendMessage } = useWebsocketService();

const query = ref("");
const selectedNoteId = ref<number | null>(props.initialData?.noteId ?? null);
const isWaiting = ref(true);

const results = useLoadMore<NoteSearchRecord>({
    limit: SEARCH_PAGE_SIZE,
    onLoadMore: async (last) => {
        const response = await sendMessage<
            SearchNoteMessage,
            SearchNoteResponse
        >("notes", "searchNote", {
            data: {
                filters: {
                    type: "general",
                    query: query.value,
                    from_id: last?.id,
                },
            },
            expect: "searchNoteResponse",
        });
        return response.results as NoteSearchRecord[];
    },
});

const findNotes = useDebouncedCallback(() => {
    isWaiting.value = false;
    return results.loadMore();
});

const handleSearch = () => {
    isWaiting.value = true;
    results.reset();
    findNotes();
};

const selectNote = (noteId: number) => {
    selectedNoteId.value = noteId;
    emit("insertDataChange", { noteId });
};

onMounted(findNotes);
</script>

<template>
    <div
        class="flex flex-col items-stretch justify-start w-[min(40rem,80vw)] max-md:w-full"
    >
        <div class="py-2 max-md:text-sm">
            Please select a note from which the link will be inserted, this link
            will dynamically show the latest title of the note.
        </div>
        <Input
            v-model="query"
            label="Find notes"
            placeholder="Search..."
            @update:model-value="handleSearch"
        />

        <div
            class="border-solid border-line border rounded-lg mt-2 grow overflow-auto"
        >
            <Skeleton
                v-if="
                    (isWaiting || results.loader.running.value) &&
                    results.records.value.length === 0
                "
                variant="list"
                class="py-1"
            />
            <template v-else>
                <div
                    v-if="results.records.value.length === 0"
                    class="p-2 text-center text-muted"
                >
                    No results found
                </div>
                <LoadMoreWrapper
                    add-class="note-link-result-view"
                    :has-more="results.hasMore.value"
                    @load-more="results.loadMore()"
                >
                    <NoteItemView
                        v-for="record in results.records.value"
                        :key="record.id"
                        :record="record"
                        hide-active-note
                        :add-class="
                            selectedNoteId === record.id ? 'bg-accent-soft' : ''
                        "
                        :search-query="query"
                        @note-click="selectNote(record.id)"
                    />
                </LoadMoreWrapper>
            </template>
        </div>
    </div>
</template>
