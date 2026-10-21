<script setup lang="ts">
import NoteLink from "@/components/notes/blocks/NoteLink.vue";
import NoteList from "@/components/notes/blocks/NoteList.vue";
import TableOfContents from "@/components/notes/TableOfContents.vue";
import { isAllowedImageUrl, type AstNodeOf } from "@/lib/markdown";
import {
    alignOf,
    playableMediaUrl,
    type MediaAlign,
} from "@/lib/markdown-snippets";
import type { MarkdownOptions } from "./Viewer.vue";

// The "unavailble" typo is the
// original's text.
defineProps<{
    node: AstNodeOf<"extension">;
    originalText: string;
    options: MarkdownOptions;
}>();

const justify: Record<MediaAlign, string> = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
};
</script>

<template>
    <TableOfContents
        v-if="node.extension === 'table-of-contents'"
        :text="originalText"
    />
    <template v-else-if="node.extension === 'note-list'">
        <div
            v-if="options.isSharing"
            class="p-1 border-solid border rounded-md border-danger/60 bg-danger-soft"
        >
            Note List is unavailble in share view.
        </div>
        <NoteList v-else :group-id="parseInt(node.params[0] ?? '')" />
    </template>
    <template v-else-if="node.extension === 'note-link'">
        <div
            v-if="options.isSharing"
            class="p-1 border-solid border rounded-md border-danger/60 bg-danger-soft"
        >
            Note Link is unavailble in share view.
        </div>
        <NoteLink v-else :note-id="parseInt(node.params[0] ?? '')" />
    </template>
    <template
        v-else-if="node.extension === 'audio' || node.extension === 'video'"
    >
        <span
            v-if="playableMediaUrl(node.params[0])"
            :class="['flex w-full', justify[alignOf(node.params[1])]]"
        >
            <component
                :is="node.extension"
                :src="playableMediaUrl(node.params[0])"
                controls
                preload="metadata"
                :class="[
                    'rounded-md',
                    node.extension === 'video'
                        ? 'block max-w-full max-h-[70vh]'
                        : 'w-full max-w-xl',
                ]"
            />
        </span>
        <span
            v-else
            class="inline-block p-1 border-solid border rounded-md border-danger/60 bg-danger-soft"
        >
            {{ node.extension === "video" ? "Video" : "Audio" }} needs an
            http(s) address or an uploaded file: "{{ node.params[0] ?? "" }}"
        </span>
    </template>
    <template v-else-if="node.extension === 'image'">
        <span
            v-if="isAllowedImageUrl(node.params[0] ?? '')"
            :class="['flex w-full', justify[alignOf(node.params[1])]]"
        >
            <img
                :src="node.params[0]"
                :alt="node.params[2] ?? ''"
                class="max-w-full"
            />
        </span>
        <span
            v-else
            class="inline-block p-1 border-solid border rounded-md border-danger/60 bg-danger-soft"
        >
            Image address is not allowed: "{{ node.params[0] ?? "" }}"
        </span>
    </template>
    <div
        v-else-if="node.extension === 'over-limit'"
        class="p-1 border-solid border rounded-md border-danger/60 bg-danger-soft"
    >
        Could not render "{{ node.params[0] }}" extension #{{ node.params[1] }}.
        Too many extensions of this type in this text. Maximum allowed is
        {{ node.params[2] }}.
    </div>
    <div
        v-else
        class="p-1 border-solid border rounded-md border-danger/60 bg-danger-soft"
    >
        Unknown extension: "{{ node.extension }}", parameters: ({{
            node.params.join(", ")
        }})
    </div>
</template>
