<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import FileSize from "./FileSize.vue";
import UploadFileRow from "./UploadFileRow.vue";
import type { FileUploader } from "@/composables/useFileUploader";

const props = withDefaults(
    defineProps<{ uploader: FileUploader; initialFiles?: File[] }>(),
    { initialFiles: () => [] },
);

const emit = defineEmits<{ upload: [files: File[]]; close: [] }>();

const input = ref<HTMLInputElement | null>(null);
const isDropping = ref(false);
const isStarted = ref(false);

const sameFile = (a: File, b: File) =>
    a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

const unique = (files: File[]) =>
    files.filter(
        (file, index) => files.findIndex((f) => sameFile(f, file)) === index,
    );

const selected = ref<File[]>(unique(props.initialFiles));

const isUploading = computed(() => props.uploader.isUploading.value);

const totalSize = computed(() =>
    selected.value.reduce((sum, file) => sum + file.size, 0),
);

const countOf = (status: string) =>
    selected.value.filter(
        (file) => props.uploader.stateOf(file)?.status === status,
    ).length;

const add = (files: File[]) => {
    selected.value = unique([...selected.value, ...files]);
};

const remove = (file: File) => {
    selected.value = selected.value.filter((f) => f !== file);
};

const start = () => {
    isStarted.value = true;
    emit("upload", selected.value);
};

const change = (event: Event) => {
    const target = event.target as HTMLInputElement;
    add(Array.from(target.files ?? []));
    target.value = "";
};

const dragOver = (event: DragEvent) => {
    if (isStarted.value || !event.dataTransfer?.types.includes("Files")) {
        return;
    }
    event.preventDefault();
    isDropping.value = true;
};

const drop = (event: DragEvent) => {
    isDropping.value = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (isStarted.value || files.length === 0) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    add(files);
};
</script>

<template>
    <Dialog
        title="Upload files"
        icon="cloud-upload"
        :can-cancel="!isUploading"
        class="w-[34rem]"
        @cancel="emit('close')"
    >
        <div>
            <template v-if="!isStarted">
                <button
                    type="button"
                    :class="[
                        'w-full flex flex-col items-center gap-1 px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                        isDropping
                            ? 'border-accent bg-accent-soft'
                            : 'border-line-strong hover:border-accent hover:bg-surface-2',
                    ]"
                    @click="input?.click()"
                    @dragover="dragOver"
                    @dragleave="isDropping = false"
                    @drop="drop"
                >
                    <Icon
                        name="cloud-upload"
                        size="2xl"
                        class-name="text-accent"
                    />
                    <span class="font-semibold">Choose files</span>
                    <span class="text-sm text-muted">or drop them here</span>
                </button>
                <input
                    ref="input"
                    type="file"
                    class="hidden"
                    multiple
                    data-testid="upload-input"
                    @change="change"
                />
            </template>

            <p
                v-if="selected.length === 0"
                class="pt-4 text-sm text-muted text-center"
            >
                No files added yet.
            </p>
            <template v-else>
                <div
                    class="flex items-center justify-between min-h-10 pt-3 pb-1 text-sm text-muted"
                >
                    <span v-if="!isStarted">
                        {{ selected.length }}
                        {{ selected.length === 1 ? "file" : "files" }},
                        <FileSize :size="totalSize" />
                    </span>
                    <span v-else data-testid="upload-summary">
                        {{ countOf("done") }} of
                        {{ selected.length }} uploaded<template
                            v-if="countOf('failed') > 0"
                            >, {{ countOf("failed") }} failed</template
                        ><template v-if="isUploading">
                            ({{ uploader.donePercentage.value }}%)</template
                        >
                    </span>
                    <Button
                        v-if="!isStarted"
                        size="xs"
                        color="transparent"
                        @click="selected = []"
                    >
                        Clear all
                    </Button>
                </div>
                <ul class="max-h-72 overflow-auto divide-y divide-line">
                    <UploadFileRow
                        v-for="file in selected"
                        :key="`${file.name}:${file.size}:${file.lastModified}`"
                        :file="file"
                        :state="isStarted ? uploader.stateOf(file) : undefined"
                        :removable="!isStarted"
                        @remove="remove(file)"
                    />
                </ul>
            </template>
        </div>
        <template #footer>
            <template v-if="!isStarted">
                <Button color="transparent" @click="emit('close')">
                    Cancel
                </Button>
                <Button
                    color="success"
                    :disabled="selected.length === 0"
                    @click="start"
                >
                    <Icon name="upload" size="lg" />
                    Upload{{ selected.length > 0 ? ` ${selected.length}` : "" }}
                    {{ selected.length === 1 ? "file" : "files" }}
                </Button>
            </template>
            <Button
                v-else-if="isUploading"
                color="transparentDanger"
                @click="uploader.cancelUpload()"
            >
                Cancel upload
            </Button>
            <Button v-else @click="emit('close')">Close</Button>
        </template>
    </Dialog>
</template>
