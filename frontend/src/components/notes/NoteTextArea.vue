<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import InsertItemDialog from "./InsertItemDialog.vue";
import type { InsertComponentId } from "./insert/insert-components";
import FileDropWrapper from "@/components/files/FileDropWrapper.vue";
import UploadProgressDialog from "@/components/files/UploadProgressDialog.vue";
import { useFileUploader } from "@/composables/useFileUploader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { createExtensionCompletion } from "@/lib/codemirror/extension-autocomplete";
import { createNoteEditorExtensions } from "@/lib/codemirror/setup";
import { runSourceTool } from "@/lib/codemirror/toolbar";
import type { EditorTool } from "@/lib/editor-tools";
import { getUploadedFilesMarkdown } from "@/lib/markdown-snippets";
import type { SearchNoteMessage, SearchNoteResponse } from "@/types/messages";
import type { NoteSearchRecord } from "@/types/records";
import { useGroupsStore } from "@/stores/groups";

const props = defineProps<{ initialText: string; isSaving: boolean }>();
const emit = defineEmits<{ change: [text: string] }>();

const { sendMessage } = useWebsocketService();
const groupsStore = useGroupsStore();
const uploader = useFileUploader();

const container = ref<HTMLDivElement | null>(null);
const editable = new Compartment();
let view: EditorView | null = null;

const completion = createExtensionCompletion({
    searchNotes: async (query) => {
        const { results } = await sendMessage<
            SearchNoteMessage,
            SearchNoteResponse
        >("notes", "searchNote", {
            data: { filters: { type: "general", query } },
            expect: "searchNoteResponse",
        });
        return (results as NoteSearchRecord[]).map((note) => ({
            id: note.id,
            name: note.title,
        }));
    },
    loadGroups: () => groupsStore.findGroups(),
});

const insertItem = ref<InsertComponentId | null>(null);

defineExpose({
    runTool: (tool: EditorTool) => {
        if (view) {
            runSourceTool(view, tool);
            view.focus();
        }
    },
    openInsert: (id: InsertComponentId) => (insertItem.value = id),
});

const insertAtCursor = (text: string) => {
    if (!view) {
        return;
    }
    const { from, to } = view.state.selection.main;
    view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
        userEvent: "input.paste",
    });
    view.focus();
};

const uploadAndInsert = async (files: File[]) => {
    const uploaded = await uploader.uploadFiles(files);
    if (uploaded.length === 0) {
        return;
    }
    insertAtCursor(getUploadedFilesMarkdown(uploaded));
};

onMounted(() => {
    view = new EditorView({
        state: EditorState.create({
            doc: props.initialText,
            extensions: createNoteEditorExtensions({
                completion,
                onChange: (text) => emit("change", text),
                onPasteFiles: (files) => void uploadAndInsert(files),
                tabIndex: 3,
                editableCompartment: editable,
                initialEditable: !props.isSaving,
            }),
        }),
        parent: container.value!,
    });
});

watch(
    () => props.isSaving,
    (isSaving) =>
        view?.dispatch({
            effects: editable.reconfigure(EditorView.editable.of(!isSaving)),
        }),
);

onBeforeUnmount(() => {
    view?.destroy();
    view = null;
});
</script>

<template>
    <div class="grow block basis-auto">
        <FileDropWrapper
            wrapper-class="w-full block"
            @files-dropped="uploadAndInsert"
        >
            <div ref="container" class="text-editor block w-full" />
        </FileDropWrapper>
        <UploadProgressDialog :uploader="uploader" />
        <InsertItemDialog
            v-if="insertItem"
            :item-id="insertItem"
            @insert="
                (text) => {
                    insertItem = null;
                    insertAtCursor(text);
                }
            "
            @close="insertItem = null"
        />
    </div>
</template>
