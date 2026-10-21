<script setup lang="ts">
import { onMounted, ref, shallowRef } from "vue";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import ErrorDisplay from "@/components/ErrorDisplay.vue";
import Icon from "@/components/Icon.vue";
import Input from "@/components/Input.vue";
import PageHeader from "@/components/PageHeader.vue";
import Pagination from "@/components/Pagination.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useFilters } from "@/composables/useFilters";
import { useLoader } from "@/composables/useLoader";
import { usePagedData } from "@/composables/usePagedData";
import { useValidation } from "@/composables/useValidation";
import { CanManageTags } from "@/lib/rbac";
import {
    addTagSchema,
    updateTagSchema,
    type AddTagRequest,
} from "@/schemas/tags";
import { useTagsStore } from "@/stores/tags";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type { TagRecord } from "@/types/records";

const NEW_TAG = 0;

const skeletonWidths = ["w-24", "w-32", "w-20", "w-28", "w-36", "w-24", "w-16"];

const tagsStore = useTagsStore();
const userStore = useUserStore();
const loader = useLoader(true);
const saving = useLoader();
const tags = usePagedData<TagRecord>(() => load());

const editingId = ref<number | null>(null);
const draft = ref("");
const tagToDelete = ref<TagRecord | null>(null);
const addValidation = useValidation<AddTagRequest>(addTagSchema);
const updateValidation = useValidation<AddTagRequest>(updateTagSchema);
const validation = shallowRef(addValidation);

const vFocus = { mounted: (element: HTMLElement) => element.focus() };

const { reportError } = useToastStore();

const load = loader.wrap(async () => {
    tags.setPagedData(
        await tagsStore.find(filters.value.name, tags.page.value),
    );
});

const { filters, setFilter } = useFilters({
    initialFilters: () => ({ name: "" }),
    onFilterLoad: () => tags.loadFirstPage(),
});

const startEdit = (id: number, name: string) => {
    if (!userStore.can(CanManageTags.Update)) {
        return;
    }
    validation.value = id === NEW_TAG ? addValidation : updateValidation;
    validation.value.reset();
    editingId.value = id;
    draft.value = name;
};

const cancelEdit = () => {
    editingId.value = null;
    validation.value.reset();
};

const save = saving.wrap(async () => {
    const id = editingId.value;
    if (id === null) {
        return;
    }
    const original = tags.results.value.find((tag) => tag.id === id);
    if (id !== NEW_TAG && original?.name === draft.value) {
        cancelEdit();
        return;
    }
    if (id === NEW_TAG && draft.value === "") {
        cancelEdit();
        return;
    }
    if (!(await validation.value.validate({ name: draft.value }))) {
        return;
    }

    try {
        if (id === NEW_TAG) {
            await tagsStore.create(draft.value);
        } else {
            await tagsStore.update(id, draft.value);
        }
        editingId.value = null;
        await load();
    } catch (error) {
        if (validation.value.setServerErrors(error)) {
            return;
        }
        reportError(error);
    }
});

const confirmDelete = async () => {
    try {
        await tagsStore.remove(tagToDelete.value!.id);
    } catch (error) {
        reportError(error);
    }
    tagToDelete.value = null;
    await load();
};

useDataChanges(["tag"], load, { skipOwnRequests: true });
onMounted(load);
</script>

<template>
    <div>
        <PageHeader title="Tags" help="admin-tags">
            This screen allows you to make changes to tags. Click on the tag
            name to edit it, or click on the minus icon to delete it. Deleted
            tags will be removed from all notes.
            <template v-if="userStore.can(CanManageTags.Update)" #actions>
                <Button color="success" @click="startEdit(NEW_TAG, '')">
                    <Icon name="plus" size="lg" /> Add
                </Button>
            </template>
        </PageHeader>

        <Input
            icon="search"
            placeholder="Search tags"
            class="mb-4"
            :model-value="filters.name"
            @update:model-value="(value) => setFilter('name', value)"
        />

        <div
            v-if="loader.running.value"
            role="status"
            aria-busy="true"
            aria-label="Loading"
            class="flex flex-wrap gap-2"
        >
            <span
                v-for="(width, index) in skeletonWidths"
                :key="index"
                :class="['skeleton h-9 rounded-lg', width]"
            />
        </div>
        <div v-else class="flex flex-wrap gap-2">
            <span
                v-if="editingId === NEW_TAG"
                class="tag-chip tag-chip-editing"
            >
                <span class="tag-name">
                    <span class="tag-sizer" aria-hidden="true"
                        >#new-tag-name</span
                    >
                    <input
                        v-model="draft"
                        v-focus
                        class="tag-input"
                        placeholder="New tag"
                        @keydown.enter.prevent="save"
                        @keydown.esc="cancelEdit"
                        @blur="save"
                    />
                </span>
                <button
                    type="button"
                    class="tag-action tag-save"
                    title="Save tag"
                    @mousedown.prevent
                    @click="save"
                >
                    <Icon name="check" size="lg" />
                </button>
            </span>
            <span
                v-for="tag in tags.results.value"
                :key="tag.id"
                :class="[
                    'tag-chip',
                    editingId === tag.id ? 'tag-chip-editing' : '',
                ]"
            >
                <template v-if="editingId === tag.id">
                    <span class="tag-name">
                        <span class="tag-sizer" aria-hidden="true"
                            >#{{ tag.name }}</span
                        >
                        <input
                            v-model="draft"
                            v-focus
                            class="tag-input"
                            @keydown.enter.prevent="save"
                            @keydown.esc="cancelEdit"
                            @blur="save"
                        />
                    </span>
                    <button
                        type="button"
                        class="tag-action tag-save"
                        title="Save tag"
                        @mousedown.prevent
                        @click="save"
                    >
                        <Icon name="check" size="lg" />
                    </button>
                </template>
                <template v-else>
                    <button
                        type="button"
                        class="tag-name"
                        data-test="tag-name"
                        title="Rename tag"
                        @click="startEdit(tag.id, tag.name)"
                    >
                        #{{ tag.name }}
                    </button>
                    <button
                        type="button"
                        class="tag-action tag-delete"
                        title="Delete tag"
                        @click="tagToDelete = tag"
                    >
                        <Icon name="minus-circle" size="lg" />
                    </button>
                </template>
            </span>
            <span
                v-if="tags.results.value.length === 0 && editingId !== NEW_TAG"
                class="text-muted text-sm"
            >
                No tags available
            </span>
        </div>
        <ErrorDisplay
            class="pt-2 text-sm"
            :state="validation.state"
            path="name"
        />
        <div
            v-if="!loader.running.value"
            class="flex items-center justify-between gap-4 mt-4 text-sm text-muted"
        >
            <span>{{ tags.total.value }} tags</span>
            <Pagination
                :total="tags.total.value"
                :per-page="tags.perPage.value"
                :current-page="tags.page.value"
                alignment-class="justify-end"
                @change="tags.changePage"
            />
        </div>
        <ConfirmDialog
            v-if="tagToDelete"
            prompt="Are you sure you want to delete this tag? This action cannot be undone."
            confirm-color="danger"
            confirm-text="Delete this tag"
            @confirm="confirmDelete"
            @cancel="tagToDelete = null"
        />
    </div>
</template>

<style scoped>
.tag-chip {
    display: inline-flex;
    align-items: stretch;
    height: 2.25rem;
    border: 1px solid var(--color-line);
    border-radius: 8px;
    background: var(--color-surface);
    overflow: hidden;
    font-size: 0.875rem;
}

.tag-chip-editing {
    border-color: var(--color-accent);
}

.tag-name {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 0 0.75rem;
    color: var(--color-fg);
    cursor: pointer;
}

button.tag-name:hover {
    background: var(--color-surface-2);
}

.tag-sizer {
    visibility: hidden;
    white-space: pre;
}

.tag-input {
    position: absolute;
    inset: 0;
    width: 100%;
    min-width: 0;
    padding: 0 0.75rem;
    background: transparent;
    outline: none;
    font: inherit;
    color: var(--color-fg);
}

.tag-action {
    display: grid;
    place-items: center;
    width: 2.25rem;
    border-left: 1px solid var(--color-line);
    color: var(--color-muted);
    cursor: pointer;
}

.tag-delete:hover {
    color: var(--color-danger);
    background: var(--color-danger-soft);
}

.tag-save {
    color: var(--color-accent);
}

.tag-save:hover {
    background: var(--color-accent-soft);
}
</style>
