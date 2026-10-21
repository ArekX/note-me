<script lang="ts">
export type FileView = "grid" | "list";
</script>

<script setup lang="ts">
import Button from "@/components/Button.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import DropdownList from "@/components/DropdownList.vue";
import Icon from "@/components/Icon.vue";
import Input from "@/components/Input.vue";
import type { FileListFilters, useFileList } from "@/composables/useFileList";

defineProps<{
    list: Pick<
        ReturnType<typeof useFileList>,
        "filters" | "hasFilters" | "setFilter" | "resetFilters"
    >;
    adminMode: boolean;
}>();

const view = defineModel<FileView>("view", { required: true });

const kinds: { value: FileListFilters["kind"]; label: string }[] = [
    { value: "", label: "All types" },
    { value: "image", label: "Images" },
    { value: "document", label: "Documents" },
    { value: "other", label: "Other" },
];

const visibilities: { id: FileListFilters["visibility"]; name: string }[] = [
    { id: "", name: "All" },
    { id: "public", name: "Public" },
    { id: "private", name: "Private" },
];

const views: { id: FileView; name: string; icon: string }[] = [
    { id: "grid", name: "Grid view", icon: "grid-alt" },
    { id: "list", name: "List view", icon: "list-ul" },
];
</script>

<template>
    <div class="flex flex-wrap items-center gap-2 mb-4">
        <Input
            icon="search"
            placeholder="Search files by name"
            class="grow min-w-48"
            :model-value="list.filters.value.name"
            @update:model-value="(value) => list.setFilter('name', value)"
        />
        <Input
            v-if="adminMode"
            icon="user"
            placeholder="Owner"
            class="w-44 max-md:grow"
            :model-value="list.filters.value.owner"
            @update:model-value="(value) => list.setFilter('owner', value)"
        />
        <DropdownList
            class="w-40 max-md:grow"
            :items="kinds"
            :model-value="list.filters.value.kind"
            @update:model-value="(value) => list.setFilter('kind', value!)"
        />
        <ButtonGroup
            :items="visibilities"
            :active-item="list.filters.value.visibility"
            :stretch-on-mobile="false"
            aria-label="Visibility"
            @select="list.setFilter('visibility', $event)"
        />
        <Button
            color="transparent"
            :disabled="!list.hasFilters.value"
            @click="list.resetFilters"
        >
            <Icon name="x" size="lg" /> Clear
        </Button>
        <ButtonGroup
            :active-item="view"
            :items="views"
            icons-only
            :stretch-on-mobile="false"
            aria-label="File view"
            @select="view = $event"
        />
        <slot name="actions" />
    </div>
</template>
