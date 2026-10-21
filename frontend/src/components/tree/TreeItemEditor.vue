<script setup lang="ts">
import { onMounted, ref } from "vue";
import Icon from "@/components/Icon.vue";
import { socketErrorMessage } from "@/lib/error-messages";
import { useTreeStore, type TreeNode } from "@/stores/tree";

const props = defineProps<{ node: TreeNode }>();

const treeStore = useTreeStore();

const name = ref(props.node.name);
const error = ref("");
const input = ref<HTMLInputElement | null>(null);

onMounted(() => input.value?.focus());

const accept = async () => {
    error.value = "";
    try {
        await treeStore.saveName(props.node.key, name.value);
    } catch (saveError) {
        error.value = socketErrorMessage(saveError);
        input.value?.focus();
    }
};

const cancel = () => treeStore.cancelEdit(props.node.key);
</script>

<template>
    <div class="group-item-editor relative flex" @click.stop>
        <div
            v-if="!treeStore.isProcessing(node.key)"
            class="absolute inset-y-0 right-0 flex items-center pr-2 text-muted"
        >
            <span
                class="hover:text-fg cursor-pointer"
                title="Accept"
                @click.stop.prevent="accept"
            >
                <Icon name="check" />
            </span>
            <span
                class="hover:text-fg cursor-pointer"
                title="Cancel"
                @click.stop.prevent="cancel"
            >
                <Icon name="block" />
            </span>
        </div>
        <div
            class="absolute inset-y-0 left-0 flex items-center pl-2 text-muted"
        >
            <Icon :name="node.type === 'group' ? 'folder' : 'file'" />
        </div>
        <input
            ref="input"
            v-model="name"
            type="text"
            class="outline-hidden border pl-9 pr-14 border-accent bg-field h-10 w-full"
            placeholder="Enter group name..."
            :disabled="treeStore.isProcessing(node.key)"
            @keydown.enter.prevent="accept"
            @keydown.esc.prevent="cancel"
        />
        <div
            v-if="error"
            class="text-white right-0 absolute bottom-10 left-0 z-40 rounded-md px-2 py-1 text-sm bg-danger"
        >
            {{ error }}
        </div>
    </div>
</template>
