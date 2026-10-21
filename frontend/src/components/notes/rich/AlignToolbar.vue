<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { Editor } from "@tiptap/core";
import Icon from "@/components/Icon.vue";
import type { MediaAlign } from "@/lib/markdown-snippets";
import {
    selectedAlignTarget,
    setAlignment,
    type AlignTarget,
} from "@/lib/rich-editor/media-align";

const props = defineProps<{ editor: Editor }>();

const aligns: { id: MediaAlign; label: string; icon: string }[] = [
    { id: "left", label: "Align left", icon: "align-left" },
    { id: "center", label: "Align center", icon: "align-middle" },
    { id: "right", label: "Align right", icon: "align-right" },
];

const toolbar = ref<HTMLDivElement | null>(null);
// Shallow: the target holds a ProseMirror node, which must not be proxied.
const target = shallowRef<AlignTarget | null>(null);
const position = ref({ top: 0, left: 0 });
const measured = ref(false);
let frame = 0;

// The visible item: an image, or the card of audio and video.
const targetElement = (pos: number) => {
    const dom = props.editor.view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) {
        return null;
    }
    return dom.matches("img") ? dom : (dom.querySelector("img") ?? dom);
};

// Node views render after the transaction, so the item is measured once
// they have.
const update = async () => {
    const next = props.editor.isEditable
        ? selectedAlignTarget(props.editor.state)
        : null;
    if (next?.pos !== target.value?.pos) {
        measured.value = false;
    }
    target.value = next;
    if (!next) {
        return;
    }
    await nextTick();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
        if (props.editor.isDestroyed) {
            return;
        }
        const element = targetElement(next.pos);
        const container = toolbar.value?.offsetParent;
        if (!element || !container || target.value !== next) {
            return;
        }
        const rect = element.getBoundingClientRect();
        const origin = container.getBoundingClientRect();
        position.value = {
            top: rect.top - origin.top,
            left: rect.left - origin.left + rect.width / 2,
        };
        measured.value = true;
    });
};

onMounted(() => {
    props.editor.on("transaction", update);
    addEventListener("resize", update);
});

onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    props.editor.off("transaction", update);
    removeEventListener("resize", update);
});
</script>

<template>
    <div
        v-if="target"
        ref="toolbar"
        class="rich-align-toolbar"
        role="toolbar"
        aria-label="Alignment"
        :style="{
            top: `${position.top}px`,
            left: `${position.left}px`,
            visibility: measured ? 'visible' : 'hidden',
        }"
    >
        <button
            v-for="align in aligns"
            :key="align.id"
            type="button"
            :title="align.label"
            :aria-label="align.label"
            :aria-pressed="target.align === align.id"
            :class="target.align === align.id && 'is-active'"
            @mousedown.prevent
            @click="setAlignment(editor, target, align.id)"
        >
            <Icon :name="align.icon" size="lg" />
        </button>
    </div>
</template>
