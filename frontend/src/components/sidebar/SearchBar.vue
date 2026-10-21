<script setup lang="ts">
import { ref, watch } from "vue";
import Icon from "@/components/Icon.vue";
import AdvancedSearch from "./search/AdvancedSearch.vue";
import { useSidebar } from "@/composables/useSidebar";
import { useSearchStore } from "@/stores/search";

withDefaults(defineProps<{ queryPlaceHolder?: string }>(), {
    queryPlaceHolder: "Search...",
});

const search = useSearchStore();
const sidebar = useSidebar();
const showAdvancedSearch = ref(false);
const input = ref<HTMLInputElement | null>(null);

watch(sidebar.searchFocusRequest, () => input.value?.focus());
</script>

<template>
    <div class="relative px-3 pt-3 pb-2 shrink-0">
        <form autocomplete="off" class="relative" @submit.prevent>
            <input type="text" class="hidden" />
            <button
                type="button"
                :class="[
                    'absolute inset-y-0 left-0 flex items-center pl-3 text-muted',
                    search.isActive
                        ? 'cursor-pointer hover:text-fg'
                        : 'pointer-events-none',
                ]"
                :title="search.isActive ? 'Clear search' : undefined"
                @click="search.resetSearch()"
            >
                <Icon :name="search.isActive ? 'x' : 'search'" size="lg" />
            </button>
            <input
                ref="input"
                :value="search.query"
                class="form-field pl-10 pr-10"
                :placeholder="queryPlaceHolder"
                name="search-input-unique"
                autocomplete="off"
                @input="
                    search.setQuery(($event.target as HTMLInputElement).value)
                "
            />
            <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-fg cursor-pointer"
                title="Advanced search"
                @click="showAdvancedSearch = true"
            >
                <Icon name="filter-alt" size="lg" />
            </button>
        </form>
        <AdvancedSearch
            v-if="showAdvancedSearch"
            @close="showAdvancedSearch = false"
        />
    </div>
</template>
