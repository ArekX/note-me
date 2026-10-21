<script setup lang="ts" generic="T extends string">
import { onBeforeUnmount, onMounted, ref } from "vue";
import Icon from "./Icon.vue";

defineProps<{ items: { key: T; label: string; icon?: string }[] }>();
const active = defineModel<T>({ required: true });

const strip = ref<HTMLElement | null>(null);
const fade = ref({ left: false, right: false });

const updateFade = () => {
    const element = strip.value;
    if (!element) {
        return;
    }
    fade.value = {
        left: element.scrollLeft > 1,
        right:
            element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    };
};

const scrollWithWheel = (event: WheelEvent) => {
    const element = strip.value;
    if (element && element.scrollWidth > element.clientWidth && event.deltaY) {
        event.preventDefault();
        element.scrollLeft += event.deltaY;
    }
};

const pick = (key: T, event: MouseEvent) => {
    active.value = key;
    (event.currentTarget as HTMLElement).scrollIntoView?.({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
    });
};

const observer =
    typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateFade);

onMounted(() => {
    if (strip.value) {
        observer?.observe(strip.value);
        strip.value
            .querySelector<HTMLElement>('[aria-selected="true"]')
            ?.scrollIntoView?.({ block: "nearest", inline: "center" });
    }
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
    <nav
        ref="strip"
        :class="[
            'tab-strip',
            fade.left ? 'tab-strip-fade-left' : '',
            fade.right ? 'tab-strip-fade-right' : '',
        ]"
        role="tablist"
        @scroll="updateFade"
        @wheel="scrollWithWheel"
    >
        <button
            v-for="item in items"
            :key="item.key"
            type="button"
            role="tab"
            :aria-selected="active === item.key"
            @click="pick(item.key, $event)"
        >
            <Icon v-if="item.icon" :name="item.icon" size="lg" />
            {{ item.label }}
        </button>
    </nav>
</template>

<style scoped>
.tab-strip {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-padding-inline: 2rem;
    scrollbar-width: none;
    --fade-left: #000;
    --fade-right: #000;
    mask-image: linear-gradient(
        to right,
        var(--fade-left),
        #000 2rem,
        #000 calc(100% - 2rem),
        var(--fade-right)
    );
    border-bottom: 1px solid var(--color-line);
}

.tab-strip::-webkit-scrollbar {
    display: none;
}

.tab-strip-fade-left {
    --fade-left: transparent;
}

.tab-strip-fade-right {
    --fade-right: transparent;
}

.tab-strip button {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 2.75rem;
    padding: 0 0.875rem;
    margin-bottom: -1px;
    border-bottom: 2px solid transparent;
    color: var(--color-muted);
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
}

.tab-strip button:hover {
    color: var(--color-fg);
}

.tab-strip button[aria-selected="true"] {
    color: var(--color-fg);
    border-bottom-color: var(--color-accent);
}
</style>
