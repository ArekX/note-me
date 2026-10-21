<script setup lang="ts">
import { computed } from "vue";
import Callout from "@/components/Callout.vue";
import IconButton from "@/components/IconButton.vue";
import {
    groupMessages,
    turnParts,
    turnStatus,
} from "@/lib/ai/conversation-view";
import { useAiStore } from "@/stores/ai";
import { useToastStore } from "@/stores/toast";
import AiChatMessages from "./AiChatMessages.vue";
import AiComposer from "./AiComposer.vue";

const ai = useAiStore();
const toastStore = useToastStore();

const current = computed(() => ai.current!);
const isRunningHere = computed(() =>
    ai.isRunningHere(current.value.conversation.id),
);
const isRunningElsewhere = computed(
    () => current.value.isRunning && !isRunningHere.value,
);

const items = computed(() => groupMessages(current.value.messages, ai.titleOf));
const live = computed(() =>
    isRunningHere.value && ai.turn ? turnParts(ai.turn.rounds) : null,
);
const liveStatus = computed(() =>
    ai.turn ? turnStatus(ai.turn.rounds) : "thinking",
);

const send = async (text: string) => {
    try {
        await ai.send(text);
        return true;
    } catch (error) {
        toastStore.reportError(error);
        return false;
    }
};

const stop = async () => {
    try {
        await ai.cancel();
    } catch (error) {
        toastStore.reportError(error);
    }
};
</script>

<template>
    <div class="flex flex-col h-full min-h-0">
        <div
            class="h-14 shrink-0 flex items-center gap-1 pl-1.5 pr-3 border-b border-line"
        >
            <IconButton icon="arrow-back" title="Back" @click="ai.close()" />
            <div class="min-w-0 grow truncate font-semibold">
                {{ current.conversation.title }}
            </div>
        </div>
        <AiChatMessages
            :items="items"
            :live="live"
            :live-status="liveStatus"
            @allow="ai.allow"
            @deny="ai.deny"
        />
        <div v-if="ai.lastError" class="px-2 pb-2">
            <Callout tone="danger" icon="error">{{ ai.lastError }}</Callout>
        </div>
        <div v-if="current.isLocked" class="p-2 border-t border-line">
            <Callout icon="lock-alt">
                Your AI access changed, so this conversation can be read but not
                continued.
            </Callout>
        </div>
        <template v-else>
            <p
                v-if="isRunningElsewhere"
                class="px-3 pt-2 text-xs text-muted border-t border-line"
            >
                The assistant is answering in another tab.
            </p>
            <AiComposer
                :running="isRunningHere"
                :disabled="isRunningElsewhere"
                placeholder="Reply..."
                :send="send"
                @stop="stop"
            />
        </template>
    </div>
</template>
