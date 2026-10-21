<script setup lang="ts">
import { computed, markRaw, onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import Pagination from "@/components/Pagination.vue";
import SideTabPanel, { type PanelItem } from "@/components/SideTabPanel.vue";
import Skeleton from "@/components/Skeleton.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import HistoryRecordView, { type ViewType } from "./HistoryRecordView.vue";
import { useLoader } from "@/composables/useLoader";
import { usePagedData } from "@/composables/usePagedData";
import { useWebsocketService } from "@/composables/useWebsocketService";
import type {
    FindNoteHistoryMessage,
    FindNoteHistoryResponse,
    NoteFrontendResponse,
} from "@/types/messages";
import type { NoteHistoryMetaRecord } from "@/types/records";

const props = defineProps<{ noteId: number; currentText: string }>();
const emit = defineEmits<{ close: [] }>();

const loader = useLoader(true);
const history = usePagedData<NoteHistoryMetaRecord>(() => load());
const selectedIndex = ref(0);
const isMobileSidePanelOpen = ref(false);
const view = ref<ViewType>("preview");

const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
    notes: { deleteHistoryRecordResponse: () => void load() },
});

const load = loader.wrap(async () => {
    const { records } = await sendMessage<
        FindNoteHistoryMessage,
        FindNoteHistoryResponse
    >("notes", "findNoteHistory", {
        data: { note_id: props.noteId, page: history.page.value },
        expect: "findNoteHistoryResponse",
    });
    history.setPagedData(records);
    selectedIndex.value = 0;
});

const items = computed<PanelItem<NoteHistoryMetaRecord>[]>(() =>
    history.results.value.map((record) => ({
        key: String(record.id),
        name: record.version,
        icon: "history",
        data: record,
        component: markRaw(HistoryRecordView),
    })),
);

const selected = computed(() => items.value[selectedIndex.value]?.data);

onMounted(load);
</script>

<template>
    <Dialog
        icon="history"
        can-cancel
        title="History"
        class="w-5/6 max-md:w-full"
        @cancel="emit('close')"
    >
        <div
            v-if="loader.running.value"
            class="flex gap-5 overflow-hidden"
            style="height: calc(100vh - 208px)"
        >
            <Skeleton
                variant="list"
                :count="6"
                class="w-1/4 shrink-0 py-2 pr-2 border-r border-line max-md:hidden"
            />
            <Skeleton variant="note" class="grow p-5" />
        </div>
        <NoItemMessage v-else-if="items.length === 0" icon="history">
            No history found.
        </NoItemMessage>
        <SideTabPanel
            v-else
            :items="items"
            :selected-index="selectedIndex"
            v-model:mobile-open="isMobileSidePanelOpen"
            :pass-props="{
                record: selected,
                noteId,
                currentText,
                view,
                onViewChange: (newView: ViewType) => (view = newView),
                onToggleVersions: () =>
                    (isMobileSidePanelOpen = !isMobileSidePanelOpen),
                onReverted: () => emit('close'),
            }"
            @select="(_item, index) => (selectedIndex = index)"
        >
            <template #subtitle="{ item }">
                <Icon class-name="ml-1" name="time" size="sm" /> Created
                <TimeAgo :time="item.data!.created_at" />
                <span
                    v-if="item.data!.is_encrypted"
                    class="max-xl:block max-xl:ml-1"
                >
                    <Icon class-name="xl:ml-2" name="lock" size="sm" />
                    Protected
                </span>
            </template>
        </SideTabPanel>

        <div class="flex flex-wrap items-center mt-4">
            <div class="basis-3/5 max-md:basis-full text-left">
                <Pagination
                    :current-page="history.page.value"
                    :per-page="history.perPage.value"
                    :total="history.total.value"
                    alignment-class="justify-start"
                    @change="history.changePage"
                />
            </div>
        </div>
        <template #footer>
            <Button color="primary" @click="emit('close')">Close</Button>
        </template>
    </Dialog>
</template>
