<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import Icon from "@/components/Icon.vue";
import { isAllowedImageUrl } from "@/lib/markdown";
import { alignOf, playableMediaUrl } from "@/lib/markdown-snippets";
import {
    parseExtensionSource,
    type NoteExtensionOptions,
} from "@/lib/rich-editor/extensions";
import { useGroupsStore } from "@/stores/groups";
import { useNotesStore } from "@/stores/notes";

const props = defineProps(nodeViewProps);

const groupsStore = useGroupsStore();
const notesStore = useNotesStore();

const extension = computed(() =>
    parseExtensionSource(props.node.attrs.source as string),
);
const firstParam = computed(() => extension.value.params[0] ?? "");
const mediaUrl = computed(() =>
    ["audio", "video"].includes(extension.value.name)
        ? playableMediaUrl(firstParam.value)
        : null,
);
const imageUrl = computed(() =>
    extension.value.name === "image" && isAllowedImageUrl(firstParam.value)
        ? firstParam.value
        : null,
);
const alignClass = computed(
    () => `align-${alignOf(extension.value.params[1])}`,
);
const editable = computed(
    () =>
        extension.value.name === "note-list" ||
        extension.value.name === "note-link",
);

const target = ref("");

const describe = async (name: string, param: string) => {
    const id = parseInt(param);
    if (name === "note-list") {
        const group =
            id === 0 ? { name: "Top level" } : await groupsStore.getGroup(id);
        if (!group) {
            throw new Error("Group not found");
        }
        return group.name;
    }
    return (await notesStore.getDetails(id, { include_title: true })).title;
};

watch(
    () => [extension.value.name, firstParam.value] as const,
    async ([name, param]) => {
        if (!editable.value) {
            return;
        }
        target.value = `#${param}`;
        try {
            const label = await describe(name, param);
            if (param === firstParam.value) {
                target.value = label;
            }
        } catch {
            target.value = `#${param} not found`;
        }
    },
    { immediate: true },
);

const chip = computed(() => {
    switch (extension.value.name) {
        case "note-list":
            return { icon: "detail", label: `Note list: ${target.value}` };
        case "note-link":
            return { icon: "note", label: `Note link: ${target.value}` };
        case "table-of-contents":
            return { icon: "book-content", label: "Table of contents" };
        case "audio":
            return { icon: "music", label: `Audio: ${firstParam.value}` };
        case "video":
            return { icon: "video", label: `Video: ${firstParam.value}` };
        case "image":
            return { icon: "image", label: `Image: ${firstParam.value}` };
    }
    return { icon: "error", label: props.node.attrs.source as string };
});

const edit = () => {
    const options = props.extension.options as NoteExtensionOptions;
    const from = props.getPos();
    if (!editable.value || from === undefined || !props.editor.isEditable) {
        return;
    }
    options.onEdit?.({
        ...extension.value,
        range: { from, to: from + props.node.nodeSize },
    });
};
</script>

<template>
    <!-- A player needs a block with a width; inside the inline-block the
         other extensions use, w-full resolves to nothing. -->
    <NodeViewWrapper
        v-if="imageUrl"
        as="span"
        :class="['rich-extension-image', alignClass]"
        contenteditable="false"
    >
        <img
            :src="imageUrl"
            :alt="extension.params[2] ?? ''"
            :class="selected && 'is-selected'"
        />
    </NodeViewWrapper>
    <NodeViewWrapper
        v-else
        as="span"
        :class="[
            mediaUrl
                ? ['rich-extension-media glass-card', alignClass]
                : 'rich-extension',
            selected && 'is-selected',
        ]"
        contenteditable="false"
    >
        <template v-if="mediaUrl">
            <span class="flex items-center gap-2 min-w-0 text-sm">
                <Icon :name="chip.icon" size="lg" class="text-accent" />
                <strong class="font-semibold">
                    {{ extension.name === "video" ? "Video" : "Audio" }}
                </strong>
            </span>
            <component
                :is="extension.name"
                :src="mediaUrl"
                controls
                preload="metadata"
                :class="[
                    'block w-full mt-3 rounded-md',
                    extension.name === 'video' && 'max-h-[50vh]',
                ]"
            />
        </template>
        <button
            v-else
            type="button"
            :class="['rich-extension-chip', !editable && 'cursor-default']"
            :title="
                editable ? 'Click to change' : (node.attrs.source as string)
            "
            @click="edit"
        >
            <Icon :name="chip.icon" />
            <span class="truncate">{{ chip.label }}</span>
        </button>
    </NodeViewWrapper>
</template>
