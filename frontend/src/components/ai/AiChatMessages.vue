<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type {
    ChatItem,
    ChatPart,
    TurnStatus,
} from "@/lib/ai/conversation-view";
import AiAnswerParts from "./AiAnswerParts.vue";
import AiThinking from "./AiThinking.vue";

const props = defineProps<{
    items: ChatItem[];
    // The answer this tab is receiving.
    live: ChatPart[] | null;
    liveStatus: TurnStatus;
}>();

const emit = defineEmits<{ allow: [id: string]; deny: [id: string] }>();

const container = ref<HTMLElement | null>(null);

// Follows the answer while it streams unless the user scrolled up.
watch(
    () => [props.items, props.live],
    async () => {
        const element = container.value;
        if (!element) {
            return;
        }
        const nearBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            80;
        await nextTick();
        if (nearBottom) {
            element.scrollTop = element.scrollHeight;
        }
    },
    { deep: true, flush: "pre" },
);
</script>

<template>
    <div ref="container" class="grow min-h-0 overflow-auto px-3 py-2">
        <template v-for="item in items" :key="item.key">
            <div v-if="item.kind === 'user'" class="flex justify-end my-2">
                <div
                    class="max-w-[85%] rounded-lg bg-accent-soft px-3 py-2 text-sm whitespace-pre-wrap break-words"
                >
                    {{ item.text }}
                </div>
            </div>
            <div v-else class="my-2 text-sm ai-answer">
                <AiAnswerParts
                    :parts="item.parts"
                    @allow="emit('allow', $event)"
                    @deny="emit('deny', $event)"
                />
            </div>
        </template>
        <div v-if="live" class="my-2 text-sm ai-answer">
            <AiAnswerParts
                :parts="live"
                @allow="emit('allow', $event)"
                @deny="emit('deny', $event)"
            />
            <AiThinking :status="liveStatus" />
        </div>
    </div>
</template>
