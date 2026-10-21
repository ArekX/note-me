<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "@/components/Button.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import DropdownMenu from "@/components/DropdownMenu.vue";
import Icon from "@/components/Icon.vue";
import Skeleton from "@/components/Skeleton.vue";
import TextDiff from "@/components/TextDiff.vue";
import LockedContentWrapper from "@/components/encryption/LockedContentWrapper.vue";
import ViewNote from "@/components/notes/ViewNote.vue";
import { useLoader } from "@/composables/useLoader";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { tagsToString } from "@/lib/tags";
import { useToastStore } from "@/stores/toast";
import type {
    DeleteHistoryRecordMessage,
    DeleteHistoryRecordResponse,
    GetNoteHistoryDataMessage,
    GetNoteHistoryDataResponse,
    RevertNoteToHistoryMessage,
    RevertNoteToHistoryResponse,
} from "@/types/messages";
import type {
    NoteHistoryDataRecord,
    NoteHistoryMetaRecord,
} from "@/types/records";

export type ViewType = "preview" | "note" | "diff";

const viewTypes: { id: ViewType; name: string; icon: string }[] = [
    { id: "preview", name: "Note", icon: "font" },
    { id: "note", name: "Markdown", icon: "markdown" },
    { id: "diff", name: "Diff", icon: "pencil" },
];

const props = defineProps<{
    record: NoteHistoryMetaRecord;
    noteId: number;
    currentText: string;
    view: ViewType;
}>();

const emit = defineEmits<{
    viewChange: [view: ViewType];
    toggleVersions: [];
    reverted: [];
}>();

const query = useResponsiveQuery();
const loader = useLoader(true);
const { sendMessage } = useWebsocketService();

const data = ref<NoteHistoryDataRecord | null>(null);
const confirmRevert = ref(false);
const confirmDelete = ref(false);

const records = computed(() => (data.value ? [data.value] : []));

const load = loader.wrap(async () => {
    const response = await sendMessage<
        GetNoteHistoryDataMessage,
        GetNoteHistoryDataResponse
    >("notes", "getNoteHistoryData", {
        data: { id: props.record.id },
        expect: "getNoteHistoryDataResponse",
    });
    data.value = response.data;
});

watch(() => props.record.id, load, { immediate: true });

const tagList = (tags: string) => (tags.length > 0 ? tags.split(",") : []);

const revert = async () => {
    await sendMessage<RevertNoteToHistoryMessage, RevertNoteToHistoryResponse>(
        "notes",
        "revertNoteToHistory",
        {
            data: { note_id: props.noteId, to_history_id: props.record.id },
            expect: "revertNoteToHistoryResponse",
        },
    );
    useToastStore().addMessage({
        type: "success",
        text: "Note has been reverted successfully.",
    });
    confirmRevert.value = false;
    emit("reverted");
};

const remove = async () => {
    await sendMessage<DeleteHistoryRecordMessage, DeleteHistoryRecordResponse>(
        "notes",
        "deleteHistoryRecord",
        {
            data: { id: props.record.id, note_id: props.noteId },
            expect: "deleteHistoryRecordResponse",
        },
    );
    confirmDelete.value = false;
};
</script>

<template>
    <Skeleton v-if="loader.running.value || !data" variant="note" class="p-5" />
    <div
        v-else
        class="flex h-full flex-col flex-nowrap justify-start items-stretch"
    >
        <div class="shrink flex w-full pb-2">
            <div class="basis-2/5 md:max-lg:basis-3/5 max-md:basis-1/4">
                <ButtonGroup
                    v-if="query.min('md')"
                    :items="viewTypes"
                    :active-item="view"
                    @select="emit('viewChange', $event)"
                />
                <template v-else>
                    <Button
                        color="primary"
                        add-class="mb-2 md:mr-2 max-md:w-full max-md:block"
                        title="Show versions"
                        @click="emit('toggleVersions')"
                    >
                        <Icon name="history" size="sm" />
                    </Button>
                    <DropdownMenu
                        popover-id="historyRecordView-0"
                        display-type="inline"
                        inline-direction="left"
                        button-border-class="border max-md:w-full max-md:block"
                        icon="show-alt"
                        :items="
                            viewTypes.map((type) => ({
                                name: type.name,
                                icon: type.icon,
                                onClick: () => emit('viewChange', type.id),
                            }))
                        "
                    />
                </template>
            </div>
            <div class="max-md:grow max-md:block hidden"></div>
            <div
                class="basis-3/5 md:max-lg:basis-2/5 max-md:basis-1/4 text-right px-2 max-md:pr-0"
            >
                <Button
                    color="warning"
                    title="Revert to this version"
                    add-class="md:ml-2 mb-2 max-md:w-full max-md:block"
                    @click="confirmRevert = true"
                >
                    <Icon v-if="query.max('lg')" name="undo" size="sm" />
                    <template v-else>
                        Revert
                        <span class="xl:inline-block hidden">
                            to this Version
                        </span>
                    </template>
                </Button>
                <Button
                    color="danger"
                    title="Delete this version"
                    add-class="md:ml-2 max-md:w-full max-md:block"
                    @click="confirmDelete = true"
                >
                    <Icon
                        v-if="query.max('lg')"
                        name="minus-circle"
                        size="sm"
                    />
                    <template v-else>Delete</template>
                </Button>
            </div>
        </div>

        <div
            class="pt-2 bg-field basis-full grow overflow-auto border border-line rounded-lg"
        >
            <div class="p-5">
                <LockedContentWrapper
                    :records="records"
                    :protected-keys="['note']"
                    is-locked-key="is_encrypted"
                >
                    <template #default="{ records: [unlocked] }">
                        <div v-if="view === 'note'">
                            <div class="text-2xl py-4">
                                {{ unlocked!.title }}
                            </div>
                            <div class="text-xl py-2">
                                {{ tagsToString(tagList(unlocked!.tags)) }}
                            </div>
                            <pre class="py-4">{{ unlocked!.note }}</pre>
                        </div>
                        <TextDiff
                            v-else-if="view === 'diff'"
                            :text1="unlocked!.note"
                            :text2="currentText"
                        />
                        <ViewNote
                            v-else
                            history-mode
                            :record="{
                                id: noteId,
                                note: unlocked!.note,
                                title: unlocked!.title,
                                tags: tagList(unlocked!.tags),
                                updated_at: record.created_at,
                                group_id: null,
                                group_name: null,
                                is_encrypted: false,
                                is_wide: true,
                            }"
                        />
                    </template>
                </LockedContentWrapper>
            </div>
        </div>

        <ConfirmDialog
            v-if="confirmRevert"
            prompt="Are you sure that you want to revert to this version? Current note will be saved as another version."
            confirm-text="Revert to this version"
            confirm-color="warning"
            @confirm="revert"
            @cancel="confirmRevert = false"
        />
        <ConfirmDialog
            v-if="confirmDelete"
            prompt="Are you sure that you want to delete this version? This action cannot be undone."
            confirm-text="Delete this version"
            confirm-color="danger"
            @confirm="remove"
            @cancel="confirmDelete = false"
        />
    </div>
</template>
