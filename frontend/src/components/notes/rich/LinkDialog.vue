<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Input from "@/components/Input.vue";
import type { LinkTarget } from "@/lib/rich-editor/commands";

const props = defineProps<{ kind: "link" | "image" } & LinkTarget>();
const emit = defineEmits<{ submit: [target: LinkTarget]; close: [] }>();

const url = ref(props.url);
const text = ref(props.text);

const submit = () =>
    emit("submit", { url: url.value.trim(), text: text.value });
</script>

<template>
    <Dialog
        can-cancel
        :title="kind === 'link' ? 'Link' : 'Image'"
        :icon="kind"
        @cancel="emit('close')"
    >
        <form
            class="flex flex-col gap-3 w-[min(28rem,80vw)] max-md:w-full"
            @submit.prevent="submit"
        >
            <Input
                v-model="url"
                :label="kind === 'link' ? 'Address' : 'Image address'"
                placeholder="https://"
            />
            <Input
                v-model="text"
                :label="kind === 'link' ? 'Text' : 'Description'"
            />
            <p v-if="kind === 'link' && props.url" class="text-sm text-muted">
                Clear the address to remove the link.
            </p>
        </form>
        <template #footer>
            <Button @click="emit('close')">Cancel</Button>
            <Button
                color="success"
                :disabled="kind === 'image' && !url.trim()"
                @click="submit"
            >
                {{ kind === "link" && !url.trim() ? "Remove link" : "Apply" }}
            </Button>
        </template>
    </Dialog>
</template>
