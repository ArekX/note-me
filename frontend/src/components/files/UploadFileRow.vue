<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import FileSize from "./FileSize.vue";
import type { FileUploadState } from "@/composables/useFileUploader";
import { fileKind, fileKindIcons } from "@/lib/file-kind";

const props = defineProps<{
    file: File;
    state?: FileUploadState;
    removable: boolean;
}>();

const emit = defineEmits<{ remove: [] }>();

const percent = computed(() =>
    props.file.size === 0 || !props.state
        ? 0
        : Math.floor((props.state.uploaded / props.file.size) * 100),
);
</script>

<template>
    <li class="py-1.5 text-sm" :data-status="state?.status ?? 'selected'">
        <div class="flex items-center gap-2 min-h-8">
            <Icon
                :name="fileKindIcons[fileKind(file.type)]"
                size="lg"
                class-name="text-muted shrink-0"
            />
            <span class="grow truncate" :title="file.name">
                {{ file.name }}
            </span>
            <FileSize :size="file.size" class="text-muted whitespace-nowrap" />
            <span v-if="!state" class="shrink-0">
                <IconButton
                    v-if="removable"
                    icon="x"
                    title="Remove"
                    @click="emit('remove')"
                />
            </span>
            <span
                v-else-if="state.status === 'waiting'"
                class="w-24 text-right text-muted"
            >
                Waiting
            </span>
            <span
                v-else-if="state.status === 'uploading'"
                class="w-24 text-right text-accent font-medium"
            >
                {{ percent }}%
            </span>
            <span
                v-else-if="state.status === 'done'"
                class="w-24 flex items-center justify-end gap-1 text-success"
            >
                <Icon name="check-circle" size="lg" /> Uploaded
            </span>
            <span
                v-else-if="state.status === 'failed'"
                class="w-24 flex items-center justify-end gap-1 text-danger"
            >
                <Icon name="x-circle" size="lg" /> Failed
            </span>
            <span v-else class="w-24 text-right text-muted">Cancelled</span>
        </div>
        <div
            v-if="state?.status === 'uploading'"
            class="h-1 mt-1 rounded-full bg-surface-2 overflow-hidden"
            role="progressbar"
            :aria-label="`Uploading ${file.name}`"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="percent"
        >
            <div
                class="h-full bg-accent transition-[width]"
                :style="{ width: `${percent}%` }"
            />
        </div>
        <p v-if="state?.error" class="pt-0.5 pl-7 text-xs text-danger">
            {{ state.error }}
        </p>
    </li>
</template>
