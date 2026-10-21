<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { closeAllPopovers } from "@/composables/useSinglePopover";
import Icon from "./Icon.vue";

const props = withDefaults(
    defineProps<{
        visible?: boolean;
        canCancel?: boolean;
        title?: string;
        icon?: string;
        tone?: "default" | "danger";
    }>(),
    {
        visible: true,
        canCancel: false,
        title: "",
        icon: undefined,
        tone: "default",
    },
);

const emit = defineEmits<{ cancel: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);

const sync = () => {
    if (!dialog.value) {
        return;
    }
    if (props.visible && !dialog.value.open) {
        dialog.value.showModal();
    } else if (!props.visible && dialog.value.open) {
        dialog.value.close();
    }
};

onMounted(sync);
watch(() => props.visible, sync);

const handleCancel = (event: Event) => {
    event.preventDefault();
    if (props.canCancel) {
        emit("cancel");
    }
};

const handleClick = (event: MouseEvent) => {
    closeAllPopovers();
    event.stopPropagation();
};
</script>

<template>
    <dialog ref="dialog" @cancel="handleCancel" @click="handleClick">
        <header
            v-if="title || $slots.title || canCancel"
            class="flex items-center gap-3 -mr-2 pb-3"
        >
            <span
                v-if="icon"
                :class="[
                    'shrink-0 size-10 grid place-items-center rounded-full',
                    tone === 'danger'
                        ? 'bg-danger-soft text-danger'
                        : 'bg-accent-soft text-accent',
                ]"
            >
                <Icon :name="icon" size="xl" />
            </span>
            <h1 class="grow text-lg font-semibold leading-snug">
                <slot name="title">{{ title }}</slot>
            </h1>
            <button
                v-if="canCancel"
                type="button"
                title="Close"
                class="shrink-0 size-8 grid place-items-center rounded-lg text-muted hover:text-fg hover:bg-surface-2 cursor-pointer"
                @click="emit('cancel')"
            >
                <Icon name="x" size="xl" />
            </button>
        </header>
        <div class="dialog-body fade-edges">
            <slot />
        </div>
        <footer v-if="$slots.footer" class="dialog-footer">
            <slot name="footer" />
        </footer>
    </dialog>
</template>
