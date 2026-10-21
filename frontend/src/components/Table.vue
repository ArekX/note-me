<script lang="ts">
export interface TableColumn<T> {
    id: string;
    name: string;
    // Shown as text when there is no cell-<id> slot.
    key?: keyof T;
    filter?: boolean;
    headerClass?: string;
    cellClass?: string;
}
</script>

<script setup lang="ts" generic="T extends object">
import { computed } from "vue";

const props = withDefaults(
    defineProps<{
        columns: TableColumn<T>[];
        rows: T[];
        isLoading?: boolean;
        skeletonRows?: number;
        noRowsText?: string;
        rowKey?: (row: T, index: number) => string | number;
        rowClass?: (row: T) => string;
    }>(),
    {
        isLoading: false,
        skeletonRows: 5,
        noRowsText: "",
        rowKey: undefined,
        rowClass: undefined,
    },
);

defineSlots<
    {
        [K in `cell-${string}`]?: (props: { row: T; index: number }) => unknown;
    } & {
        [K in `filter-${string}`]?: () => unknown;
    } & {
        [K in `header-${string}`]?: () => unknown;
    }
>();

const hasFilters = computed(() => props.columns.some((c) => c.filter));

const keyOf = (row: T, index: number) => props.rowKey?.(row, index) ?? index;
</script>

<template>
    <div class="w-full overflow-x-auto glass-card">
        <table class="w-full text-sm">
            <thead>
                <tr class="text-left">
                    <th
                        v-for="column in columns"
                        :key="column.id"
                        :class="column.headerClass"
                    >
                        <slot :name="`header-${column.id}`">
                            {{ column.name }}
                        </slot>
                    </th>
                </tr>
                <tr v-if="hasFilters" class="filters">
                    <td v-for="column in columns" :key="column.id">
                        <slot
                            v-if="column.filter"
                            :name="`filter-${column.id}`"
                        />
                    </td>
                </tr>
            </thead>
            <tbody>
                <template v-if="isLoading">
                    <tr
                        v-for="row in skeletonRows"
                        :key="row"
                        aria-busy="true"
                        class="skeleton-row"
                    >
                        <td v-for="column in columns" :key="column.id">
                            <span
                                v-if="column.name"
                                :class="[
                                    'skeleton h-3.5',
                                    row % 2 ? 'w-4/5' : 'w-3/5',
                                ]"
                            />
                        </td>
                    </tr>
                </template>
                <template v-else>
                    <tr
                        v-for="(row, index) in rows"
                        :key="keyOf(row, index)"
                        :class="rowClass?.(row)"
                    >
                        <td
                            v-for="column in columns"
                            :key="column.id"
                            :class="column.cellClass"
                        >
                            <slot
                                :name="`cell-${column.id}`"
                                :row="row"
                                :index="index"
                            >
                                {{ column.key ? row[column.key] : "" }}
                            </slot>
                        </td>
                    </tr>
                    <tr v-if="rows.length === 0 && noRowsText">
                        <td
                            :colspan="columns.length"
                            class="text-center text-muted py-8"
                        >
                            {{ noRowsText }}
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>
</template>
