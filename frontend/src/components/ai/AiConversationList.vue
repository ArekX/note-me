<script setup lang="ts">
import SidebarList from "@/components/sidebar/SidebarList.vue";
import { useAiStore } from "@/stores/ai";
import { useToastStore } from "@/stores/toast";
import AiComposer from "./AiComposer.vue";
import AiConversationItem from "./AiConversationItem.vue";

const ai = useAiStore();
const toastStore = useToastStore();

// Sending from the list starts a new conversation, which then opens.
const send = async (text: string) => {
    try {
        await ai.send(text);
        return true;
    } catch (error) {
        toastStore.reportError(error);
        return false;
    }
};
</script>

<template>
    <div class="flex flex-col h-full min-h-0">
        <SidebarList
            :list="ai.conversations"
            empty-icon="bot"
            :record-key="(record) => record.id"
        >
            <template #switcher>AI Assistant</template>
            <template #search></template>
            <template #empty>
                No conversations yet. Ask the assistant something below.
            </template>
            <template #default="{ record }">
                <AiConversationItem :record="record" />
            </template>
        </SidebarList>
        <AiComposer placeholder="Start a new conversation..." :send="send" />
    </div>
</template>
