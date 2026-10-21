<script setup lang="ts">
import { useHelpStore } from "@/stores/help";
import { inject, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import Viewer from "@/components/markdown/Viewer.vue";
import DetailsLine from "./DetailsLine.vue";
import MoreMenu, { type MoreMenuAction } from "./MoreMenu.vue";
import NoteWindow from "./NoteWindow.vue";
import { isNoteWindowType, type NoteWindowType } from "./note-windows";
import { useNoteWebsocket } from "@/composables/useNoteWebsocket";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import { useNoteCrumbs } from "@/composables/useNoteCrumbs";
import { TOP_BAR_ACTIONS_ID } from "@/composables/useTopBar";
import { redirectTo } from "@/lib/redirect";
import { downloadTextAsMarkdown } from "@/lib/text-downloader";
import { useSearchStore } from "@/stores/search";
import type { ViewNoteRecord } from "@/types/records";

// historyMode shows a stored version and
// shareMode "everyone" a public link: no actions and no live updates in
// either; readonly is a note shared with the viewer.
const props = withDefaults(
    defineProps<{
        record: ViewNoteRecord;
        historyMode?: boolean;
        readonly?: boolean;
        shareMode?: "none" | "everyone" | "users";
        disableTagLinks?: boolean;
        author?: string | null;
    }>(),
    {
        historyMode: false,
        readonly: false,
        shareMode: "none",
        disableTagLinks: false,
        author: null,
    },
);

const emit = defineEmits<{ reload: [] }>();

const hasActions = !props.historyMode && props.shareMode !== "everyone";
const tagLinksDisabled = props.historyMode || props.disableTagLinks;

const router = useRouter();
const query = useResponsiveQuery();
const search = useSearchStore();
const helpStore = useHelpStore();

const note = ref<ViewNoteRecord>({ ...props.record });
const windowType = ref<NoteWindowType | null>(null);

if (hasActions) {
    useNoteWebsocket(props.record.id, (data, fromElsewhere) => {
        // Protected text arrives encrypted; the page decrypts a reloaded
        // note. The page itself replaces the note after this tab's revert.
        if (
            fromElsewhere &&
            data.text !== undefined &&
            (data.is_encrypted ?? note.value.is_encrypted)
        ) {
            emit("reload");
            return;
        }
        note.value = {
            ...note.value,
            title: data.title ?? note.value.title,
            tags: data.tags ?? note.value.tags,
            note: data.text ?? note.value.note,
            is_encrypted: data.is_encrypted ?? note.value.is_encrypted,
            is_wide: data.is_wide ?? note.value.is_wide,
            group_id:
                data.group_id !== undefined
                    ? data.group_id
                    : note.value.group_id,
            group_name:
                data.group_name !== undefined
                    ? data.group_name
                    : note.value.group_name,
        };
    });
}

const inTopBar = hasActions && inject("hasTopBar", false);

if (inTopBar) {
    useNoteCrumbs(() =>
        props.readonly
            ? {
                  groupId: null,
                  groupName: null,
                  tail: [
                      { label: "Shared with me" },
                      { label: note.value.title },
                  ],
              }
            : {
                  groupId: note.value.group_id,
                  groupName: note.value.group_name,
                  tail: [{ label: note.value.title }],
              },
    );
}

const openEditor = () =>
    router.push(redirectTo.editNote({ noteId: note.value.id }));

const handleAction = (action: MoreMenuAction) => {
    if (isNoteWindowType(action)) {
        windowType.value = action;
        return;
    }
    switch (action) {
        case "help":
            helpStore.open();
            break;
        case "download":
            downloadTextAsMarkdown(note.value.title, note.value.note);
            break;
        case "open-editor":
            void openEditor();
            break;
    }
};
</script>

<template>
    <div
        :class="[
            'view-note flex flex-col',
            !note.is_wide && 'note-normal-width',
        ]"
    >
        <div class="flex items-start gap-3">
            <h1 class="title grow min-w-0">{{ note.title }}</h1>
            <Teleport
                v-if="hasActions"
                defer
                :to="`#${TOP_BAR_ACTIONS_ID}`"
                :disabled="!inTopBar"
            >
                <div class="flex items-center gap-2 shrink-0">
                    <Button
                        v-if="!readonly"
                        color="success"
                        size="sm"
                        title="Edit"
                        @click="openEditor"
                    >
                        <Icon name="pencil" size="lg" />
                        <span class="max-md:hidden">Edit</span>
                    </Button>
                    <Button
                        v-if="!readonly && query.min('md')"
                        size="sm"
                        title="Share"
                        @click="handleAction('share')"
                    >
                        <Icon name="share-alt" size="lg" /> Share
                    </Button>
                    <MoreMenu
                        :mode="readonly ? 'view-readonly' : 'view'"
                        :in-preview-mode="false"
                        @action="handleAction"
                    />
                </div>
            </Teleport>
        </div>
        <div class="w-full overflow-hidden">
            <span
                v-for="tag in note.tags"
                :key="tag"
                :class="[
                    'text-ellipsis inline-block tag',
                    tagLinksDisabled
                        ? 'cursor-default pointer-events-none'
                        : 'cursor-pointer',
                ]"
                @click="search.setTags([tag])"
            >
                #{{ tag }}
            </span>
        </div>
        <DetailsLine
            :group-id="note.group_id"
            :group-name="note.group_name"
            :last-updated-unix="note.updated_at"
            :author="author"
        />
        <div class="py-4">
            <Viewer
                :text="note.note"
                :options="{ isSharing: shareMode !== 'none' }"
            />
        </div>
        <NoteWindow
            v-if="windowType && hasActions"
            :type="windowType"
            :note-id="note.id"
            :existing-note-text="note.note"
            :is-protected="note.is_encrypted"
            @close="windowType = null"
        />
    </div>
</template>
