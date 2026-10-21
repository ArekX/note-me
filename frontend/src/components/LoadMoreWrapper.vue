<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUpdated, ref } from "vue";
import Skeleton from "./Skeleton.vue";

const props = withDefaults(
    defineProps<{ hasMore: boolean; addClass?: string }>(),
    { addClass: "" },
);

const emit = defineEmits<{ loadMore: [] }>();

const ARM_DELAY_MS = 1000;

const sentinel = ref<HTMLDivElement | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

let observer: IntersectionObserver | null = null;

// Re-observing after every render reports the sentinel again when loaded
// records still do not fill the panel.
const arm = () => {
    observer ??= new IntersectionObserver(
        (entries) => {
            if (entries[0]?.isIntersecting && props.hasMore && !timer) {
                emit("loadMore");
            }
        },
        { root: null, threshold: 0.9 },
    );
    observer.disconnect();
    clearTimeout(timer);
    timer = setTimeout(() => {
        timer = undefined;
        if (sentinel.value) {
            observer?.observe(sentinel.value);
        }
    }, ARM_DELAY_MS);
};

onMounted(arm);
onUpdated(arm);
onBeforeUnmount(() => {
    observer?.disconnect();
    clearTimeout(timer);
});
</script>

<template>
    <div :class="addClass">
        <slot />
        <div v-if="hasMore" ref="sentinel">
            <Skeleton variant="list" :count="2" />
        </div>
    </div>
</template>
