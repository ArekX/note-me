<script setup lang="ts">
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    onUpdated,
    ref,
    watch,
} from "vue";
import { useDebouncedCallback } from "@/composables/useDebouncedCallback";
import { useSinglePopover } from "@/composables/useSinglePopover";
import { useWindowResize } from "@/composables/useWindowResize";
import { findTagSides, getFormattedTagString, getTagArray } from "@/lib/tags";
import { useTagsStore } from "@/stores/tags";

const props = withDefaults(
    defineProps<{
        initialTags?: string[];
        isSaving?: boolean;
        placeholder?: string;
        addClass?: string;
        noTransparentBackground?: boolean;
        commitOnSeparator?: boolean;
        excludeTags?: string[];
    }>(),
    {
        initialTags: () => [],
        isSaving: false,
        placeholder: "Tag your note",
        addClass: "",
        noTransparentBackground: false,
        commitOnSeparator: false,
        excludeTags: () => [],
    },
);

const emit = defineEmits<{
    change: [tags: string[]];
    enterPressed: [];
    backspaceOnEmpty: [];
}>();

const tagsStore = useTagsStore();

const tagString = ref(getFormattedTagString(props.initialTags.join(" ")));
const input = ref<HTMLInputElement | null>(null);
const dropdown = ref<HTMLDivElement | null>(null);
const wrapper = ref<HTMLDivElement | null>(null);
const isSearching = ref(false);
const selectedIndex = ref<number | null>(null);
const suggestions = ref<string[]>([]);
// A modal dialog sits in the top layer, above anything teleported to body.
const menuTarget = ref<HTMLElement | "body">("body");

const { isOpen, open, close } = useSinglePopover("tagInput-0", dropdown);
const isShown = computed(
    () => isOpen.value && (isSearching.value || suggestions.value.length > 0),
);

watch(
    () => props.initialTags,
    (tags) => {
        if (getTagArray(tagString.value).join(",") !== tags.join(",")) {
            tagString.value = getFormattedTagString(tags.join(" "));
        }
    },
);

// Clearing an already empty model after a typed separator would not
// re-render the field.
const setValue = (value: string) => {
    tagString.value = value;
    if (input.value) {
        input.value.value = value;
    }
};

const writeTags = () => {
    tagString.value = getFormattedTagString(tagString.value);
    emit("change", getTagArray(tagString.value));
};

const commit = (text: string, rest = "") => {
    const tags = getTagArray(text);
    setValue(rest);
    if (tags.length > 0) {
        emit("change", tags);
    }
};

const finish = () =>
    props.commitOnSeparator ? commit(tagString.value) : writeTags();

const positionDropdown = () => {
    const element = input.value;
    const menu = dropdown.value;
    if (!element || !menu) {
        return;
    }

    const styles = getComputedStyle(element);
    const sides = findTagSides(element.value, element.selectionStart ?? 0);
    const span = document.createElement("span");
    span.style.fontFamily = styles.fontFamily;
    span.style.fontSize = styles.fontSize;
    span.style.fontWeight = styles.fontWeight;
    span.style.fontStyle = styles.fontStyle;
    span.style.letterSpacing = styles.letterSpacing;
    span.style.whiteSpace = "pre";
    span.style.position = "absolute";
    span.style.visibility = "hidden";
    span.textContent = element.value.substring(0, sides?.leftIndex ?? 0);
    document.body.appendChild(span);
    const textWidth = span.offsetWidth;
    span.remove();

    const gap = 4;
    const margin = 8;
    const rect = element.getBoundingClientRect();
    const tagLeft =
        rect.left +
        (parseFloat(styles.borderLeftWidth) || 0) +
        (parseFloat(styles.paddingLeft) || 0) +
        textWidth -
        element.scrollLeft;
    const left = Math.max(
        margin,
        Math.min(tagLeft, innerWidth - menu.offsetWidth - margin),
    );
    const above = rect.top - gap - menu.offsetHeight;
    const fitsBelow =
        rect.bottom + gap + menu.offsetHeight <= innerHeight - margin;
    const top = fitsBelow || above < margin ? rect.bottom + gap : above;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
};

const reposition = () => {
    if (isShown.value) {
        positionDropdown();
    }
};

onUpdated(reposition);
useWindowResize(reposition);

watch(isOpen, (opened) => {
    selectedIndex.value = opened ? 0 : null;
});

let latestSearch = 0;

const search = useDebouncedCallback(async (tag: string) => {
    const current = ++latestSearch;
    try {
        const { results } = await tagsStore.find(tag);
        if (current === latestSearch) {
            const added = new Set(
                [
                    ...props.excludeTags,
                    ...(props.commitOnSeparator
                        ? []
                        : getTagArray(tagString.value)),
                ].map((name) => name.toLowerCase()),
            );
            suggestions.value = results
                .map((record) => record.name)
                .filter((name) => !added.has(name.toLowerCase()));
            selectedIndex.value = 0;
        }
    } finally {
        if (current === latestSearch) {
            isSearching.value = false;
        }
    }
}, 250);

const updateSuggestions = () => {
    const element = input.value;
    const sides = element
        ? findTagSides(element.value, element.selectionStart ?? 0)
        : null;
    if (!sides?.tag) {
        latestSearch++;
        isSearching.value = false;
        close();
        return;
    }

    isSearching.value = true;
    open();
    search(sides.tag);
};

const handleInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    tagString.value = value;

    if (props.commitOnSeparator && /[\s,]/.test(value)) {
        const parts = value.split(/[\s,]/);
        const rest = parts.pop() ?? "";
        commit(parts.join(" "), rest);
    }

    updateSuggestions();
};

const insertTag = (tag: string) => {
    const element = input.value;
    if (!element) {
        return;
    }

    const sides = findTagSides(element.value, element.selectionStart ?? 0);
    if (!sides) {
        return;
    }

    let before = element.value.substring(0, sides.leftIndex).trim();
    let after = element.value.substring(sides.rightIndex).trim();
    if (before.length > 0) {
        before += " ";
    }
    if (after.length > 0) {
        after = " " + after;
    }

    tagString.value = before + `#${tag}` + after;
    const caret = sides.leftIndex + tag.length + 2;
    void nextTick(() => element.setSelectionRange(caret, caret));
};

const pick = (tag: string) => {
    close();
    if (props.commitOnSeparator) {
        commit(tag);
        return;
    }
    insertTag(tag);
    emit("change", getTagArray(tagString.value));
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "s") {
        finish();
        return;
    }

    const canPick = isShown.value && !isSearching.value;

    if (event.key === "Backspace" && input.value?.value === "") {
        emit("backspaceOnEmpty");
        return;
    }

    if (event.key === "Escape" && isShown.value) {
        event.preventDefault();
        close();
    } else if (event.key === "Enter") {
        if (canPick && selectedIndex.value !== null) {
            event.preventDefault();
            pick(suggestions.value[selectedIndex.value]!);
            return;
        }
        close();
        finish();
        emit("enterPressed");
    } else if (canPick && event.key === "ArrowDown") {
        selectedIndex.value = Math.min(
            (selectedIndex.value ?? -1) + 1,
            suggestions.value.length - 1,
        );
        event.preventDefault();
    } else if (canPick && event.key === "ArrowUp") {
        selectedIndex.value = Math.max((selectedIndex.value ?? 1) - 1, 0);
        event.preventDefault();
    }
};

const handleKeyup = (event: KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        updateSuggestions();
    }
};

const handleBlur = () => {
    close();
    finish();
};

watch(selectedIndex, async (index) => {
    await nextTick();
    if (index !== null) {
        dropdown.value?.children[index]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
        });
    }
});

onMounted(() => {
    menuTarget.value = wrapper.value?.closest("dialog") ?? "body";
    addEventListener("scroll", reposition, true);
});
onBeforeUnmount(() => removeEventListener("scroll", reposition, true));

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
    <div ref="wrapper">
        <input
            ref="input"
            :value="tagString"
            :class="[
                'outline-hidden block mt-2 w-full tag-editor',
                noTransparentBackground ? '' : 'bg-transparent',
                addClass,
            ]"
            type="text"
            autocomplete="off"
            :placeholder="placeholder"
            :tabindex="2"
            :disabled="isSaving"
            @input="handleInput"
            @blur="handleBlur"
            @keydown="handleKeydown"
            @keyup="handleKeyup"
        />
        <Teleport :to="menuTarget">
            <div
                v-if="isShown"
                ref="dropdown"
                role="listbox"
                class="z-50 fixed top-0 left-0 min-w-40 max-w-xs popup-menu text-fg text-sm max-h-52 overflow-auto rounded-[10px] p-1"
                @mousedown.prevent
            >
                <div
                    v-if="isSearching"
                    role="status"
                    aria-busy="true"
                    aria-label="Searching"
                >
                    <div
                        v-for="width in ['w-24', 'w-32', 'w-20']"
                        :key="width"
                        class="px-3 py-2"
                    >
                        <span :class="['skeleton h-3.5', width]" />
                    </div>
                </div>
                <template v-else>
                    <div
                        v-for="(tag, index) in suggestions"
                        :key="tag"
                        role="option"
                        :aria-selected="selectedIndex === index"
                        :class="[
                            'cursor-pointer rounded-md px-3 py-2 truncate hover:bg-surface-2',
                            selectedIndex === index ? 'bg-surface-2' : '',
                        ]"
                        @click="pick(tag)"
                    >
                        #{{ tag }}
                    </div>
                </template>
            </div>
        </Teleport>
    </div>
</template>
