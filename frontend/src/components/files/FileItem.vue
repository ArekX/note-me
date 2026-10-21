<script setup lang="ts">
import { computed } from "vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import FileSize from "./FileSize.vue";
import { previewKind } from "@/lib/file-kind";
import { getFileViewUrl } from "@/lib/markdown-snippets";
import type { FileMetaRecord } from "@/types/records";

const props = defineProps<{
    file: FileMetaRecord;
    isSelected: boolean;
    isProcessing: boolean;
    adminMode: boolean;
    card?: boolean;
}>();

// glass-card sets its own border and shadow, so a selected card is
// outlined instead.
const frameClass = computed(() => {
    if (props.card) {
        return [
            "glass-card overflow-hidden",
            props.isSelected
                ? "outline-2 outline-accent"
                : "hover:outline hover:outline-line-strong",
        ];
    }
    return [
        "rounded-lg border border-solid",
        props.isSelected
            ? "border-accent ring-2 ring-accent-soft"
            : "border-line hover:border-line-strong",
    ];
});

const emit = defineEmits<{
    select: [];
    selectMultiple: [];
    activate: [];
    delete: [];
    toggleVisibility: [];
}>();

const viewer = computed(() => previewKind(props.file.mime_type));

const url = computed(() => getFileViewUrl(props.file.identifier));

const click = (event: MouseEvent) =>
    event.ctrlKey ? emit("selectMultiple") : emit("select");
</script>

<template>
    <div
        :class="['max-md:mb-2 group cursor-pointer relative', frameClass]"
        @click="click"
        @dblclick="emit('activate')"
    >
        <div class="block text-center bg-field rounded-tl-lg rounded-tr-lg">
            <img
                v-if="viewer === 'image'"
                :src="url"
                :alt="file.name"
                class="h-40 inline-block rounded-tl-lg rounded-tr-lg"
            />
            <video
                v-else-if="viewer === 'video'"
                controls
                :src="url"
                class="h-40 inline-block rounded-tl-lg rounded-tr-lg"
            />
            <template v-else-if="viewer === 'audio'">
                <div class="h-32 flex items-center justify-center text-white">
                    <Icon name="music" type="solid" size="5xl" />
                </div>
                <audio
                    controls
                    :src="url"
                    class="h-8 block w-full rounded-tl-lg rounded-tr-lg"
                />
            </template>
            <div
                v-else
                class="h-40 flex items-center justify-center text-white rounded-tl-lg rounded-tr-lg"
            >
                <Icon name="file" size="5xl" />
            </div>
        </div>

        <div
            class="p-2 h-10 whitespace-nowrap overflow-hidden text-ellipsis"
            :title="file.name"
        >
            {{ file.name }}
        </div>

        <div class="text-xs p-2 max-md:hidden">
            Type: {{ file.mime_type.length > 0 ? file.mime_type : "unknown" }}
            <br />
            Size: <FileSize :size="file.size" /> <br />
            Only visible to you: {{ file.is_public ? "No" : "Yes" }} <br />
            Uploaded: <TimeAgo :time="file.created_at" /> <br />
            <template v-if="adminMode">
                <br />Created by: {{ file.created_by }}
            </template>
        </div>

        <div
            v-if="!isProcessing"
            class="absolute top-0 right-0 pr-2 pt-2 opacity-0 group-hover:opacity-70 group-hover:hover:opacity-100"
        >
            <Button
                color="danger"
                size="xs"
                title="Delete this file"
                @click.stop.prevent="emit('delete')"
            >
                <Icon name="minus-circle" />
            </Button>
            <div class="pt-1">
                <Button
                    color="primary"
                    size="xs"
                    :title="
                        file.is_public
                            ? 'Make this file visible only to you'
                            : 'Make this file visible to everyone'
                    "
                    @click.stop.prevent="emit('toggleVisibility')"
                >
                    <Icon :name="file.is_public ? 'show' : 'hide'" />
                </Button>
            </div>
        </div>
    </div>
</template>
