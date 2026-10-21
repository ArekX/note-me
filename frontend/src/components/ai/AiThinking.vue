<script setup lang="ts">
import type { TurnStatus } from "@/lib/ai/conversation-view";

defineProps<{ status: TurnStatus }>();

const labels: Record<TurnStatus, string> = {
    thinking: "Thinking",
    working: "Working",
    writing: "Writing",
    waiting: "Waiting for you",
};
</script>

<template>
    <div
        class="ai-thinking inline-flex items-center gap-2 my-1 px-2.5 py-1 rounded-full bg-surface-2 text-xs text-muted"
        role="status"
    >
        <span
            v-if="status !== 'waiting'"
            class="ai-thinking-dots"
            aria-hidden="true"
        >
            <span></span><span></span><span></span>
        </span>
        <span>{{ labels[status] }}</span>
    </div>
</template>

<style scoped>
.ai-thinking-dots {
    display: inline-flex;
    gap: 3px;
}

.ai-thinking-dots span {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--color-accent);
    animation: ai-thinking-bounce 1.2s ease-in-out infinite;
}

.ai-thinking-dots span:nth-child(2) {
    animation-delay: 0.15s;
}

.ai-thinking-dots span:nth-child(3) {
    animation-delay: 0.3s;
}

@keyframes ai-thinking-bounce {
    0%,
    60%,
    100% {
        opacity: 0.35;
        transform: translateY(0);
    }
    30% {
        opacity: 1;
        transform: translateY(-3px);
    }
}

@media (prefers-reduced-motion: reduce) {
    .ai-thinking-dots span {
        animation: none;
        opacity: 0.7;
    }
}
</style>
