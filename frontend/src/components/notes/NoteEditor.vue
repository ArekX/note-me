<script setup lang="ts">
import { useHelpStore } from "@/stores/help";
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import Callout from "@/components/Callout.vue";
import ErrorDisplay from "@/components/ErrorDisplay.vue";
import Icon from "@/components/Icon.vue";
import Loader from "@/components/Loader.vue";
import Viewer from "@/components/markdown/Viewer.vue";
import DetailsLine from "./DetailsLine.vue";
import EditorToolbar from "./EditorToolbar.vue";
import type { InsertComponentId } from "./insert/insert-components";
import MoreMenu, { type MoreMenuAction } from "./MoreMenu.vue";
import NoteTextArea from "./NoteTextArea.vue";
import NoteWindow from "./NoteWindow.vue";
import { isNoteWindowType, type NoteWindowType } from "./note-windows";
import TagChipsInput from "./TagChipsInput.vue";
import { useContentEncryption } from "@/composables/useContentEncryption";
import { useHotkeys } from "@/composables/useHotkeys";
import { useLoader } from "@/composables/useLoader";
import { useNoteWebsocket } from "@/composables/useNoteWebsocket";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import { useNoteCrumbs } from "@/composables/useNoteCrumbs";
import { TOP_BAR_ACTIONS_ID } from "@/composables/useTopBar";
import { useValidation } from "@/composables/useValidation";
import type { EditorTool } from "@/lib/editor-tools";
import { redirectTo } from "@/lib/redirect";
import { downloadTextAsMarkdown } from "@/lib/text-downloader";
import { addNoteRequestSchema, type AddNoteRequest } from "@/schemas/notes";
import { useNotesStore } from "@/stores/notes";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type { PreferredEditor, ViewNoteRecord } from "@/types/records";

// Tiptap is large, so the rich editor is fetched when it is first used.
const RichTextArea = defineAsyncComponent(() => import("./RichTextArea.vue"));

export type NoteEditorData = Pick<
    ViewNoteRecord,
    | "title"
    | "note"
    | "is_encrypted"
    | "is_wide"
    | "tags"
    | "group_id"
    | "group_name"
> & { id: number | null };

const props = defineProps<{ note: NoteEditorData }>();
const emit = defineEmits<{ reload: [] }>();

const router = useRouter();
const helpStore = useHelpStore();
const notesStore = useNotesStore();
const toastStore = useToastStore();
const userStore = useUserStore();
const query = useResponsiveQuery();
const saving = useLoader();
const validation = useValidation<AddNoteRequest>(addNoteRequestSchema);
const contentEncryption = useContentEncryption();

const name = ref(props.note.title);
const text = ref(props.note.note);
const tags = ref<string[]>(props.note.tags);
const groupId = ref(props.note.group_id);
const groupName = ref(props.note.group_name);
const isProtected = ref(props.note.is_encrypted);
const isWide = ref(props.note.is_wide);
const noteId = props.note.id;

useNoteCrumbs(() => ({
    groupId: groupId.value,
    groupName: groupName.value,
    tail: noteId
        ? [
              {
                  label: name.value || "Untitled",
                  to: redirectTo.viewNote({ noteId }),
              },
              { label: "Editing" },
          ]
        : [{ label: "New note" }],
}));
const isPreviewMode = ref(false);
const modes = [
    { id: "rich" as const, name: "Rich text", icon: "pencil" },
    { id: "source" as const, name: "Markdown source", icon: "code-alt" },
    { id: "preview" as const, name: "Preview", icon: "show" },
];
// The profile only picks the editor a note opens in.
const editorMode = ref<PreferredEditor>(
    userStore.user?.preferred_editor ?? "rich",
);
const selectMode = (mode: (typeof modes)[number]["id"]) => {
    isPreviewMode.value = mode === "preview";
    if (mode !== "preview") {
        editorMode.value = mode;
    }
};
const textArea = ref<{
    runTool: (tool: EditorTool) => void;
    openInsert: (id: InsertComponentId) => void;
} | null>(null);
const wasDataChanged = ref(false);
const changedElsewhere = ref(false);
const windowType = ref<NoteWindowType | null>(null);

// A change from elsewhere never overwrites unsaved edits; without them, new
// text reloads the note (it may need decrypting).
useNoteWebsocket(noteId, (data, fromElsewhere) => {
    if (fromElsewhere && wasDataChanged.value) {
        changedElsewhere.value = true;
        return;
    }
    if (fromElsewhere && data.text !== undefined) {
        emit("reload");
        return;
    }
    name.value = data.title ?? name.value;
    tags.value = data.tags ?? tags.value;
    isProtected.value = data.is_encrypted ?? isProtected.value;
    isWide.value = data.is_wide ?? isWide.value;
    if (data.group_id !== undefined) {
        groupId.value = data.group_id;
    }
    if (data.group_name !== undefined) {
        groupName.value = data.group_name;
    }
});

const save = () =>
    saving.run(async () => {
        const request: AddNoteRequest = {
            group_id: groupId.value,
            tags: tags.value,
            is_encrypted: isProtected.value,
            is_wide: isWide.value,
            text: text.value,
            title: name.value,
        };

        if (!(await validation.validate(request))) {
            return;
        }

        try {
            if (isProtected.value) {
                request.text = await contentEncryption.encryptText(text.value);
            }

            if (noteId) {
                await notesStore.updateNote(noteId, request);
                wasDataChanged.value = false;
                toastStore.addMessage({
                    type: "success",
                    text: "Note updated successfully",
                });
                return;
            }

            const { record } = await notesStore.createNote(request);
            wasDataChanged.value = false;
            await router.push(redirectTo.viewNote({ noteId: record.id }));
        } catch (error) {
            if (validation.setServerErrors(error)) {
                return;
            }
            toastStore.reportError(error);
        }
    });

const reloadChangedNote = () => {
    wasDataChanged.value = false;
    emit("reload");
};

const toggleProtection = () => {
    isProtected.value = !isProtected.value;
    wasDataChanged.value = true;
};

const toggleWidth = () => {
    isWide.value = !isWide.value;
    wasDataChanged.value = true;
};

const close = () => router.push(redirectTo.viewNote({ noteId: noteId! }));

const handleAction = (action: MoreMenuAction) => {
    if (isNoteWindowType(action)) {
        windowType.value = action;
        return;
    }
    switch (action) {
        case "preview":
            isPreviewMode.value = true;
            break;
        case "edit":
            isPreviewMode.value = false;
            break;
        case "help":
            helpStore.open();
            break;
        case "download":
            downloadTextAsMarkdown(name.value, text.value);
            break;
        case "editor-save":
            void save();
            break;
        case "editor-toggle-protection":
            toggleProtection();
            break;
        case "open-viewer":
            void close();
            break;
    }
};

useHotkeys("noteEditor", {
    save: () => void save(),
    togglePreview: () => (isPreviewMode.value = !isPreviewMode.value),
});

const confirmDiscard = () =>
    !wasDataChanged.value ||
    confirm("Are you sure you want to discard changes?");

onBeforeRouteLeave(confirmDiscard);
onBeforeRouteUpdate(confirmDiscard);

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (wasDataChanged.value) {
        event.preventDefault();
    }
};

onMounted(() => addEventListener("beforeunload", handleBeforeUnload));
onBeforeUnmount(() => removeEventListener("beforeunload", handleBeforeUnload));

const changeName = (event: Event) => {
    name.value = (event.target as HTMLInputElement).value;
    wasDataChanged.value = true;
};

const changeText = (value: string) => {
    if (value !== text.value) {
        wasDataChanged.value = true;
    }
    text.value = value;
};

const changeTags = (value: string[]) => {
    if (value.join(",") !== tags.value.join(",")) {
        wasDataChanged.value = true;
    }
    tags.value = value;
};
</script>

<template>
    <div :class="['note-editor flex flex-col', !isWide && 'note-normal-width']">
        <Callout
            v-if="changedElsewhere"
            icon="error"
            role="alert"
            class="mb-3 items-center"
        >
            This note was changed elsewhere.
            <span class="inline-flex gap-2 ml-2 align-middle">
                <Button size="xs" color="warning" @click="reloadChangedNote">
                    Reload
                </Button>
                <Button size="xs" @click="changedElsewhere = false">
                    Keep mine
                </Button>
            </span>
        </Callout>
        <div class="flex items-start gap-3">
            <div class="grow min-w-0">
                <input
                    class="title-editor"
                    type="text"
                    placeholder="Name your note"
                    :tabindex="1"
                    :value="name"
                    :disabled="saving.running.value"
                    @input="changeName"
                />
                <ErrorDisplay :state="validation.state" path="title" />
            </div>
            <Teleport defer :to="`#${TOP_BAR_ACTIONS_ID}`">
                <div class="flex items-center gap-2 shrink-0">
                    <Button
                        v-if="noteId && query.min('md')"
                        size="sm"
                        :disabled="saving.running.value"
                        title="Close"
                        @click="close"
                    >
                        Close
                    </Button>
                    <Button
                        :color="
                            saving.running.value ? 'successDisabled' : 'success'
                        "
                        size="sm"
                        title="Save"
                        :disabled="saving.running.value"
                        @click="save"
                    >
                        <Loader
                            v-if="saving.running.value"
                            color="black"
                            size="sm"
                        >
                            Saving...
                        </Loader>
                        <template v-else>
                            <Icon name="save" size="lg" />
                            <span class="max-md:hidden">Save</span>
                        </template>
                    </Button>

                    <MoreMenu
                        v-if="!saving.running.value"
                        :mode="noteId ? 'edit-existing' : 'edit-new'"
                        :in-preview-mode="isPreviewMode"
                        :is-protected="isProtected"
                        @action="handleAction"
                    />
                </div>
            </Teleport>
        </div>

        <div class="grow">
            <TagChipsInput
                :is-saving="saving.running.value"
                :tags="tags"
                @change="changeTags"
            />
            <ErrorDisplay :state="validation.state" path="tags" />
        </div>
        <div class="flex flex-wrap items-end justify-between gap-2">
            <DetailsLine
                class="grow"
                :group-id="groupId"
                :group-name="groupName"
            />
            <div class="flex items-center gap-1">
                <ButtonGroup
                    :items="modes"
                    :active-item="isPreviewMode ? 'preview' : editorMode"
                    icons-only
                    size="sm"
                    :stretch-on-mobile="false"
                    aria-label="Editor mode"
                    @select="selectMode"
                />
                <Button
                    v-if="query.min('md')"
                    color="transparent"
                    size="sm"
                    :title="isWide ? 'Use normal width' : 'Use full width'"
                    :aria-pressed="isWide"
                    :disabled="saving.running.value"
                    @click="toggleWidth"
                >
                    <Icon
                        :name="
                            isWide ? 'collapse-horizontal' : 'expand-horizontal'
                        "
                        size="xl"
                    />
                </Button>
                <Button
                    color="transparent"
                    size="sm"
                    :title="isProtected ? 'Unprotect' : 'Protect'"
                    :disabled="saving.running.value"
                    @click="toggleProtection"
                >
                    <Icon
                        :name="isProtected ? 'lock-alt' : 'lock-open-alt'"
                        :type="isProtected ? 'solid' : 'regular'"
                        size="xl"
                    />
                </Button>
            </div>
        </div>
        <div class="mt-2">
            <ErrorDisplay :state="validation.state" path="text" />
        </div>

        <EditorToolbar
            :disabled="saving.running.value || isPreviewMode"
            @tool="(tool) => textArea?.runTool(tool)"
            @insert="(id) => textArea?.openInsert(id)"
        />
        <div v-if="isPreviewMode" class="mt-3 px-1">
            <Viewer :text="text" />
        </div>
        <div v-else class="mt-3">
            <RichTextArea
                v-if="editorMode === 'rich'"
                ref="textArea"
                :initial-text="text"
                :is-saving="saving.running.value"
                @change="changeText"
            />
            <NoteTextArea
                v-else
                ref="textArea"
                :initial-text="text"
                :is-saving="saving.running.value"
                @change="changeText"
            />
        </div>

        <NoteWindow
            v-if="noteId && windowType"
            :type="windowType"
            :note-id="noteId"
            :existing-note-text="text"
            :is-protected="isProtected"
            @close="windowType = null"
        />
    </div>
</template>
