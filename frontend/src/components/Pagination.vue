<script setup lang="ts">
import { computed } from "vue";
import Button from "./Button.vue";
import Icon from "./Icon.vue";

const props = withDefaults(
    defineProps<{
        total: number;
        perPage: number;
        currentPage: number;
        alignmentClass?: string;
    }>(),
    { alignmentClass: "justify-center" },
);

const emit = defineEmits<{ change: [page: number] }>();

const pages = computed(() => Math.ceil(props.total / props.perPage));

// Up to nine page buttons around the current page; near either end the
// window shifts so it stays nine wide.
const pageNumbers = computed(() => {
    const current = props.currentPage;
    let endStride = 4;
    if (current <= 4) {
        endStride += 4 - current + 1;
    }
    const end = Math.min(current + endStride, pages.value);

    let startStride = 4;
    if (current + 4 > end) {
        startStride += current + 4 - end;
    }
    const start = Math.min(Math.max(1, current - startStride), pages.value);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

const label = (page: number) =>
    page.toString().padStart(pages.value.toString().length, "0");

const edgeClass = (isDisabled: boolean) =>
    isDisabled ? "pointer-events-none opacity-20" : "";
</script>

<template>
    <div v-if="total > perPage" :class="['flex flex-wrap', alignmentClass]">
        <Button
            :add-class="`ml-2 ${edgeClass(currentPage === 1)}`"
            :disabled="currentPage === 1"
            size="sm"
            title="Previous page"
            @click="emit('change', currentPage - 1)"
        >
            <Icon name="chevron-left" />
        </Button>
        <Button
            :add-class="`max-md:hidden ml-2 ${edgeClass(currentPage === 1)}`"
            :disabled="currentPage === 1"
            size="sm"
            title="First page"
            @click="emit('change', 1)"
        >
            <Icon name="chevrons-left" />
        </Button>
        <Button
            v-for="page in pageNumbers"
            :key="page"
            :add-class="`max-md:hidden ml-2 ${currentPage === page ? 'pointer-events-none' : ''}`"
            :color="currentPage === page ? 'success' : 'primary'"
            :disabled="currentPage === page"
            size="sm"
            @click="emit('change', page)"
        >
            {{ label(page) }}
        </Button>
        <span class="md:hidden ml-2 self-center text-sm text-muted">
            Page {{ currentPage }} of {{ pages }}
        </span>
        <Button
            :add-class="`max-md:hidden ml-2 ${edgeClass(currentPage === pages)}`"
            :disabled="currentPage === pages"
            size="sm"
            title="Last page"
            @click="emit('change', pages)"
        >
            <Icon name="chevrons-right" />
        </Button>
        <Button
            :add-class="`ml-2 ${edgeClass(currentPage === pages)}`"
            :disabled="currentPage === pages"
            size="sm"
            title="Next page"
            @click="emit('change', currentPage + 1)"
        >
            <Icon name="chevron-right" />
        </Button>
    </div>
</template>
