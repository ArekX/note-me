<script setup lang="ts">
import { ref, watch } from "vue";
import type { Range } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import { EditorContent, useEditor, VueNodeViewRenderer } from "@tiptap/vue-3";
import FileDropWrapper from "@/components/files/FileDropWrapper.vue";
import UploadProgressDialog from "@/components/files/UploadProgressDialog.vue";
import { useFileUploader } from "@/composables/useFileUploader";
import type { EditorTool } from "@/lib/editor-tools";
import { getUploadedFilesMarkdown } from "@/lib/markdown-snippets";
import {
    applyLink,
    insertImage,
    insertMarkdown,
    runRichTool,
    selectedLink,
    type LinkTarget,
} from "@/lib/rich-editor/commands";
import {
    createRichEditorExtensions,
    type ExtensionEdit,
} from "@/lib/rich-editor/extensions";
import { markdownToDoc } from "@/lib/rich-editor/markdown-parse";
import { docToMarkdown } from "@/lib/rich-editor/markdown-serialize";
import InsertItemDialog from "./InsertItemDialog.vue";
import type { InsertComponentId } from "./insert/insert-components";
import AlignToolbar from "./rich/AlignToolbar.vue";
import CodeBlockView from "./rich/CodeBlockView.vue";
import ExtensionView from "./rich/ExtensionView.vue";
import LinkDialog from "./rich/LinkDialog.vue";

const props = defineProps<{ initialText: string; isSaving: boolean }>();
const emit = defineEmits<{ change: [text: string] }>();

const uploader = useFileUploader();

const insertItem = ref<InsertComponentId | null>(null);
const insertInitialData = ref<object | null>(null);
const linkDialog = ref<({ kind: "link" | "image" } & LinkTarget) | null>(null);
let insertRange: Range | null = null;

const dialogs = {
    openLink: () => {
        if (editor.value) {
            linkDialog.value = { kind: "link", ...selectedLink(editor.value) };
        }
    },
    openImage: () => {
        if (editor.value) {
            const { from, to } = editor.value.state.selection;
            const text = editor.value.state.doc.textBetween(from, to, " ");
            linkDialog.value = { kind: "image", url: "", text };
        }
    },
};

const editExtension = ({ name, params, range }: ExtensionEdit) => {
    const id = parseInt(params[0] ?? "");
    insertRange = range;
    insertInitialData.value =
        name === "note-list" ? { groupId: id } : { noteId: id };
    insertItem.value = name as InsertComponentId;
};

const isInCode = (view: EditorView) =>
    !!view.state.selection.$from.parent.type.spec.code;

const uploadAndInsert = async (files: File[]) => {
    const uploaded = await uploader.uploadFiles(files);
    if (uploaded.length > 0 && editor.value) {
        insertMarkdown(editor.value, getUploadedFilesMarkdown(uploaded));
    }
};

const editor = useEditor({
    content: markdownToDoc(props.initialText),
    editable: !props.isSaving,
    extensions: createRichEditorExtensions({
        shortcuts: dialogs,
        onEditExtension: editExtension,
        codeBlockView: VueNodeViewRenderer(CodeBlockView),
        extensionView: VueNodeViewRenderer(ExtensionView),
    }),
    editorProps: {
        attributes: {
            class: "markdown-viewer rich-editor-content",
            tabindex: "3",
            "aria-label": "Note text",
        },
        // Pasted text is markdown, like in the source editor; a copy from
        // this editor keeps its own structure.
        handlePaste: (view, event) => {
            const data = event.clipboardData;
            const files = Array.from(data?.files ?? []);
            if (files.length > 0) {
                event.preventDefault();
                void uploadAndInsert(files);
                return true;
            }
            const text = data?.getData("text/plain") ?? "";
            const html = data?.getData("text/html") ?? "";
            if (!text || html.includes("data-pm-slice") || isInCode(view)) {
                return false;
            }
            insertMarkdown(editor.value!, text);
            return true;
        },
        // The drop wrapper uploads the files; they land where they were dropped.
        handleDrop: (view, event) => {
            if (!event.dataTransfer?.files.length) {
                return false;
            }
            const target = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
            });
            if (target) {
                editor.value?.commands.setTextSelection(target.pos);
            }
            return true;
        },
        clipboardTextSerializer: (slice) =>
            docToMarkdown({ type: "doc", content: slice.content.toJSON() }),
    },
    onUpdate: ({ editor: updated }) =>
        emit("change", docToMarkdown(updated.getJSON())),
});

watch(
    () => props.isSaving,
    (isSaving) => editor.value?.setEditable(!isSaving, false),
);

const closeInsert = () => {
    insertItem.value = null;
    insertInitialData.value = null;
    insertRange = null;
};

const insert = (text: string) => {
    const range = insertRange;
    closeInsert();
    if (editor.value) {
        insertMarkdown(editor.value, text, range ?? undefined);
    }
};

const submitLink = (target: LinkTarget) => {
    const kind = linkDialog.value?.kind;
    linkDialog.value = null;
    if (!editor.value) {
        return;
    }
    if (kind === "image") {
        insertImage(editor.value, target);
    } else {
        applyLink(editor.value, target);
    }
};

defineExpose({
    runTool: (tool: EditorTool) => {
        if (editor.value) {
            runRichTool(editor.value, tool, dialogs);
        }
    },
    openInsert: (id: InsertComponentId) => (insertItem.value = id),
});
</script>

<template>
    <div class="grow block basis-auto">
        <FileDropWrapper
            wrapper-class="w-full block"
            @files-dropped="uploadAndInsert"
        >
            <div class="rich-editor relative block w-full">
                <EditorContent :editor="editor" />
                <AlignToolbar v-if="editor" :editor="editor" />
            </div>
        </FileDropWrapper>
        <UploadProgressDialog :uploader="uploader" />
        <InsertItemDialog
            v-if="insertItem"
            :item-id="insertItem"
            :initial-data="insertInitialData"
            @insert="insert"
            @close="closeInsert"
        />
        <LinkDialog
            v-if="linkDialog"
            v-bind="linkDialog"
            @submit="submitLink"
            @close="linkDialog = null"
        />
    </div>
</template>
