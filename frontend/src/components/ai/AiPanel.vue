<script setup lang="ts">
import { useAiStore } from "@/stores/ai";
import AiConversationList from "./AiConversationList.vue";
import AiConversationView from "./AiConversationView.vue";

const ai = useAiStore();
</script>

<template>
    <AiConversationView v-if="ai.current" />
    <AiConversationList v-else />
</template>
