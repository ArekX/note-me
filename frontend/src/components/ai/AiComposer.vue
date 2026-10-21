<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import { aiMessageSchema } from "@/schemas/ai";

const props = withDefaults(
    defineProps<{
        running?: boolean;
        disabled?: boolean;
        placeholder?: string;
        // Resolves false when the message was not sent, so it stays.
        send: (text: string) => Promise<boolean>;
    }>(),
    { running: false, disabled: false, placeholder: "Ask the assistant..." },
);

const emit = defineEmits<{ stop: [] }>();

const text = ref("");
const error = ref("");
const isSending = ref(false);

const submit = async () => {
    if (props.running || props.disabled || isSending.value) {
        return;
    }
    const result = aiMessageSchema.safeParse({ text: text.value });
    if (!result.success) {
        error.value = result.error.issues[0]!.message;
        return;
    }
    error.value = "";
    isSending.value = true;
    try {
        if (await props.send(text.value)) {
            text.value = "";
        }
    } finally {
        isSending.value = false;
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        void submit();
    }
};
</script>

<template>
    <div class="shrink-0 border-t border-line p-2">
        <textarea
            v-model="text"
            rows="3"
            class="w-full resize-none rounded-md bg-surface-2 border border-line px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-line-strong"
            :placeholder="placeholder"
            :disabled="disabled"
            aria-label="Message"
            @keydown="handleKeydown"
        ></textarea>
        <div class="flex items-center gap-2 pt-1">
            <p class="grow text-xs text-danger">{{ error }}</p>
            <Button
                v-if="running"
                size="sm"
                color="warning"
                title="Stop"
                @click="emit('stop')"
            >
                <Icon name="stop" size="lg" /> Stop
            </Button>
            <Button
                v-else
                size="sm"
                color="success"
                title="Send"
                :disabled="disabled || isSending"
                @click="submit"
            >
                <Icon name="send" size="lg" /> Send
            </Button>
        </div>
    </div>
</template>
