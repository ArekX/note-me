<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import ButtonGroup from "@/components/ButtonGroup.vue";
import Icon from "@/components/Icon.vue";
import MermaidDiagram from "@/components/markdown/MermaidDiagram.vue";
import { useDebouncedCallback } from "@/composables/useDebouncedCallback";
import { codeLanguages, findCodeLanguage } from "@/lib/code-languages";

const props = defineProps(nodeViewProps);

const special = [
    { value: "", label: "Plain text" },
    { value: "mermaid", label: "Mermaid diagram" },
];
const known = codeLanguages.map((language) => ({
    value: language.id,
    label: language.name,
}));

const language = computed(
    () => (props.node.attrs.language as string | null) ?? "",
);
const isMermaid = computed(() => language.value.split(/\s+/)[0] === "mermaid");

// An alias such as "js" shows as its language but is only rewritten when
// another language is picked; anything unknown stays as written.
const selectedLanguage = computed(() => {
    const first = language.value.split(/\s+/)[0] ?? "";
    if (special.some((option) => option.value === first)) {
        return first;
    }
    return findCodeLanguage(first)?.id ?? language.value;
});
const options = computed(() =>
    [...special, ...known].some(
        (option) => option.value === selectedLanguage.value,
    )
        ? [...special, ...known]
        : [
              ...special,
              { value: selectedLanguage.value, label: selectedLanguage.value },
              ...known,
          ],
);

const setLanguage = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (value !== selectedLanguage.value) {
        props.updateAttributes({ language: value || null });
    }
};

// A click on the card outside the code selects the whole block, so it can
// be copied and deleted as one. Tiptap's focus() would put back the previous
// selection when the editor is not focused yet, so the view is focused
// directly.
const selectBlock = (event: MouseEvent) => {
    const pos = props.getPos();
    if (
        (event.target as HTMLElement).closest("pre, select, button") ||
        pos === undefined
    ) {
        return;
    }
    event.preventDefault();
    const { view } = props.editor;
    view.dispatch(
        view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)),
    );
    view.focus();
};

const views = [
    { id: "code" as const, name: "Code", icon: "code-alt" },
    { id: "diagram" as const, name: "Diagram", icon: "network-chart" },
    { id: "split" as const, name: "Split", icon: "columns" },
];
type DiagramView = (typeof views)[number]["id"];

// An empty diagram would hide the only place to type it.
const defaultView = (): DiagramView =>
    props.node.textContent.trim() ? "diagram" : "split";

const view = ref<DiagramView>(defaultView());
watch(isMermaid, (mermaid) => {
    if (mermaid) {
        view.value = defaultView();
    }
});
const showCode = computed(() => !isMermaid.value || view.value !== "diagram");
const showDiagram = computed(() => isMermaid.value && view.value !== "code");

// With the code hidden, a cursor left in it would type where nothing shows,
// so the block is selected instead.
const selectView = (next: DiagramView) => {
    view.value = next;
    const pos = props.getPos();
    const { selection } = props.editor.state;
    if (
        next === "diagram" &&
        pos !== undefined &&
        selection.from > pos &&
        selection.to < pos + props.node.nodeSize
    ) {
        const { view: editorView } = props.editor;
        editorView.dispatch(
            editorView.state.tr.setSelection(
                NodeSelection.create(editorView.state.doc, pos),
            ),
        );
    }
};

const diagramCode = ref(props.node.textContent);
const updateDiagram = useDebouncedCallback(
    (code: string) => (diagramCode.value = code),
);
watch(() => props.node.textContent, updateDiagram);
</script>

<template>
    <NodeViewWrapper
        :class="['rich-code-block glass-card', selected && 'is-selected']"
        @mousedown="selectBlock"
    >
        <div class="rich-code-header" contenteditable="false">
            <Icon name="code-alt" size="lg" class="text-accent" />
            <select
                aria-label="Code language"
                :value="selectedLanguage"
                :disabled="!editor.isEditable"
                @change="setLanguage"
            >
                <option
                    v-for="option in options"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </select>
            <ButtonGroup
                v-if="isMermaid"
                class="ml-auto"
                :items="views"
                :active-item="view"
                icons-only
                size="sm"
                :stretch-on-mobile="false"
                aria-label="Diagram view"
                @select="selectView"
            />
        </div>
        <pre :class="!showCode && 'hidden'"><NodeViewContent as="code" /></pre>
        <div
            v-if="showDiagram"
            :class="showCode && 'mt-3'"
            contenteditable="false"
        >
            <MermaidDiagram :code="diagramCode" />
        </div>
    </NodeViewWrapper>
</template>
