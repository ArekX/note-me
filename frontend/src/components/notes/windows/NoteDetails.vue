<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import Dialog from "@/components/Dialog.vue";
import Skeleton from "@/components/Skeleton.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import TableOfContents from "../TableOfContents.vue";
import { useLoader } from "@/composables/useLoader";
import { useNotesStore } from "@/stores/notes";
import { useToastStore } from "@/stores/toast";
import type { NoteDetailsRecord } from "@/types/records";

const props = defineProps<{ noteId: number; text: string }>();
const emit = defineEmits<{ close: [] }>();

const notesStore = useNotesStore();
const loader = useLoader(true);
const record = ref<NoteDetailsRecord | null>(null);
const selected = ref("general");

const tabs = [
    { id: "general", name: "General" },
    { id: "toc", name: "Table of Contents" },
];

onMounted(() =>
    loader.run(async () => {
        try {
            record.value = await notesStore.getDetails(props.noteId, {
                include_note: false,
                include_group: true,
                include_user: true,
                include_timestamp: true,
                include_title: true,
            });
        } catch (error) {
            useToastStore().reportError(error);
            emit("close");
        }
    }),
);
</script>

<template>
    <Dialog
        icon="info-circle"
        visible
        can-cancel
        title="Details"
        @cancel="emit('close')"
    >
        <div v-if="loader.running.value">
            <span class="skeleton h-9 w-60 rounded-lg" />
            <Skeleton :count="6" class="py-5" />
        </div>
        <div v-else-if="record">
            <ButtonGroup
                :items="tabs"
                :active-item="selected"
                @select="selected = $event"
            />

            <div class="py-5">
                <template v-if="selected === 'general'">
                    <strong>Note ID:</strong> {{ noteId }} <br />
                    <strong>Title:</strong> {{ record.title }} <br />
                    <template v-if="record.group_name">
                        <strong>Group:</strong> {{ record.group_name }}
                        <br />
                    </template>
                    <strong>Created:</strong>
                    <TimeAgo :time="record.created_at" /> <br />
                    <strong>Last update:</strong>
                    <TimeAgo :time="record.updated_at" /> <br />
                    <strong>Created by:</strong> {{ record.user_name }}
                </template>
                <div v-else class="markdown-viewer">
                    <TableOfContents
                        :text="text"
                        disable-links
                        no-toc-message="No table of contents found, ToC is generated from markdown headings."
                    />
                </div>
            </div>
        </div>
        <template #footer>
            <Button color="primary" @click="emit('close')">Close</Button>
        </template>
    </Dialog>
</template>
