<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import { stepLabel, type ChatStep } from "@/lib/ai/conversation-view";

const props = defineProps<{ steps: ChatStep[] }>();
const emit = defineEmits<{ allow: [id: string]; deny: [id: string] }>();

const RESULT_PREVIEW = 2000;

const isOpen = ref(false);
const openSteps = ref(new Set<string>());

const waiting = computed(() =>
    props.steps.some((step) => step.status === "waiting"),
);

// A step that waits for Allow / Deny is never hidden.
watch(
    waiting,
    (value) => {
        if (value) {
            isOpen.value = true;
        }
    },
    { immediate: true },
);

const statusIcons = {
    waiting: {
        name: "help-circle",
        className: "text-warning",
        label: "Waiting",
    },
    running: { name: "loader-alt", className: "text-muted", label: "Running" },
    done: { name: "check", className: "text-success", label: "Done" },
    failed: { name: "x", className: "text-danger", label: "Failed" },
    declined: { name: "block", className: "text-muted", label: "Declined" },
} as const;

const toggleStep = (id: string) => {
    const next = new Set(openSteps.value);
    if (next.has(id)) {
        next.delete(id);
    } else {
        next.add(id);
    }
    openSteps.value = next;
};

const formatArguments = (args: unknown) => JSON.stringify(args, null, 2);

const preview = (result: string) =>
    result.length > RESULT_PREVIEW
        ? result.slice(0, RESULT_PREVIEW) + "…"
        : result;
</script>

<template>
    <div class="my-1.5 rounded-md border border-line text-xs">
        <button
            type="button"
            class="w-full flex items-center gap-1.5 px-2 py-1.5 text-muted hover:text-fg"
            :aria-expanded="isOpen"
            @click="isOpen = !isOpen"
        >
            <Icon :name="isOpen ? 'chevron-down' : 'chevron-right'" size="md" />
            {{ steps.length === 1 ? "1 step" : `${steps.length} steps` }}
        </button>
        <ul v-if="isOpen" class="border-t border-line">
            <li
                v-for="step in steps"
                :key="step.id"
                class="px-2 py-1.5 border-b border-line last:border-b-0"
            >
                <button
                    type="button"
                    class="w-full flex items-start gap-1.5 text-left"
                    :aria-expanded="openSteps.has(step.id)"
                    @click="toggleStep(step.id)"
                >
                    <Icon
                        :name="statusIcons[step.status].name"
                        :class-name="statusIcons[step.status].className"
                        :animation="
                            step.status === 'running' ? 'spin' : undefined
                        "
                        size="md"
                    />
                    <span class="grow min-w-0 break-words">
                        {{ stepLabel(step.title, step.arguments) }}
                    </span>
                    <span class="sr-only">{{
                        statusIcons[step.status].label
                    }}</span>
                </button>
                <div
                    v-if="step.status === 'waiting'"
                    class="flex gap-2 pt-1.5 pl-5"
                >
                    <Button
                        size="xs"
                        color="success"
                        @click="emit('allow', step.id)"
                    >
                        Allow
                    </Button>
                    <Button size="xs" @click="emit('deny', step.id)">
                        Deny
                    </Button>
                </div>
                <div v-if="openSteps.has(step.id)" class="pt-1.5 pl-5">
                    <div class="text-muted">Arguments</div>
                    <pre class="ai-step-pre">{{
                        formatArguments(step.arguments)
                    }}</pre>
                    <template v-if="step.result">
                        <div class="text-muted pt-1">Result</div>
                        <pre class="ai-step-pre">{{
                            preview(step.result)
                        }}</pre>
                    </template>
                </div>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.ai-step-pre {
    max-height: 12rem;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 0.375rem 0.5rem;
    border-radius: 6px;
    background: var(--color-surface-2);
}
</style>
