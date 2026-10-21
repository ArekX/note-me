<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import TabStrip from "./TabStrip.vue";

// `route` is a route name.
const props = defineProps<{
    links: { name: string; route: string; icon?: string }[];
}>();

const route = useRoute();
const router = useRouter();

const items = computed(() =>
    props.links.map((link) => ({
        key: link.route,
        label: link.name,
        icon: link.icon,
    })),
);

const active = computed({
    get: () => route.name as string,
    set: (name: string) => void router.push({ name }),
});
</script>

<template>
    <div class="text-fg px-10 py-6 max-md:px-4 max-md:py-3">
        <TabStrip v-model="active" :items="items" />
        <div class="pt-6">
            <slot />
        </div>
    </div>
</template>
