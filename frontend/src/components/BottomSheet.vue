<script setup lang="ts">
import { ref } from "vue";

withDefaults(defineProps<{ open: boolean; title?: string }>(), {
    title: undefined,
});
const emit = defineEmits<{ close: [] }>();

const offset = ref(0);
let startY: number | null = null;

const onDown = (event: PointerEvent) => {
    startY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};

const onMove = (event: PointerEvent) => {
    if (startY !== null) {
        offset.value = Math.max(0, event.clientY - startY);
    }
};

// Dragged further than this, the sheet closes on release.
const CLOSE_DISTANCE_PX = 80;

const onUp = () => {
    if (offset.value > CLOSE_DISTANCE_PX) {
        emit("close");
    }
    startY = null;
    offset.value = 0;
};
</script>

<template>
    <Teleport to="body">
        <Transition name="sheet-fade">
            <div
                v-if="open"
                class="fixed inset-0 z-[60] bg-black/50"
                @click="emit('close')"
            ></div>
        </Transition>
        <Transition name="sheet-slide">
            <div
                v-if="open"
                class="fixed inset-x-0 bottom-0 z-[61] max-h-[85dvh] flex flex-col rounded-t-xl border-t border-line-strong bg-menu text-fg shadow-float"
                :style="{
                    transform: offset ? `translateY(${offset}px)` : undefined,
                    transition: offset ? 'none' : undefined,
                    paddingBottom: 'env(safe-area-inset-bottom)',
                }"
                role="dialog"
                :aria-label="title"
            >
                <div
                    class="pt-2 pb-3 cursor-grab touch-none"
                    @pointerdown="onDown"
                    @pointermove="onMove"
                    @pointerup="onUp"
                    @pointercancel="onUp"
                >
                    <div
                        class="mx-auto h-1.5 w-10 rounded-full bg-white/30"
                    ></div>
                    <div v-if="title" class="text-center font-medium pt-2">
                        {{ title }}
                    </div>
                </div>
                <div class="overflow-auto py-4 fade-edges">
                    <slot />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.sheet-fade-enter-active,
.sheet-fade-leave-active {
    transition: opacity 0.2s;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
    opacity: 0;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
    transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
    transform: translateY(100%);
}
</style>
