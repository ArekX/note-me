<script setup lang="ts">
import { ref } from "vue";
import Icon from "@/components/Icon.vue";
import TagInput from "./TagInput.vue";

const props = withDefaults(
    defineProps<{ tags: string[]; isSaving?: boolean }>(),
    { isSaving: false },
);
const emit = defineEmits<{ change: [tags: string[]] }>();

const tagInput = ref<InstanceType<typeof TagInput> | null>(null);

const add = (added: string[]) => {
    if (added.length === 0) {
        return;
    }
    emit("change", [...new Set([...props.tags, ...added])]);
};

const removeLast = () => {
    if (props.tags.length > 0) {
        emit("change", props.tags.slice(0, -1));
    }
};

const remove = (tag: string) =>
    emit(
        "change",
        props.tags.filter((item) => item !== tag),
    );
</script>

<template>
    <div
        class="flex flex-wrap items-center gap-1.5 mt-3 cursor-text"
        @click.self="tagInput?.focus()"
    >
        <span
            v-for="tag in tags"
            :key="tag"
            class="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-md bg-surface-2 text-sm text-muted"
        >
            #{{ tag }}
            <button
                type="button"
                class="size-5 grid place-items-center rounded-full hover:bg-line-strong hover:text-fg cursor-pointer"
                :title="`Remove ${tag}`"
                :disabled="isSaving"
                @click="remove(tag)"
            >
                <Icon name="x" size="sm" />
            </button>
        </span>
        <TagInput
            ref="tagInput"
            class="min-w-36 grow"
            add-class="tag-add-input"
            placeholder="Add tag…"
            commit-on-separator
            :exclude-tags="tags"
            :is-saving="isSaving"
            @change="add"
            @backspace-on-empty="removeLast"
        />
    </div>
</template>
