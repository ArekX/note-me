<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import Input from "@/components/Input.vue";

export interface InsertTableData {
    rows: string[][];
}

const emit = defineEmits<{ insertDataChange: [data: InsertTableData] }>();

const rows = ref<string[][]>([["", ""]]);

const setRows = (newRows: string[][]) => {
    rows.value = newRows;
    emit("insertDataChange", { rows: newRows });
};

const setCell = (rowIndex: number, cellIndex: number, value: string) =>
    setRows(
        rows.value.map((row, r) =>
            r === rowIndex
                ? row.map((cell, c) => (c === cellIndex ? value : cell))
                : row,
        ),
    );

const addColumn = () => setRows(rows.value.map((row) => [...row, ""]));

const addRow = () =>
    setRows([...rows.value, rows.value[0]?.map(() => "") ?? [""]]);

const removeColumn = (columnIndex: number) =>
    setRows(rows.value.map((row) => row.filter((_, c) => c !== columnIndex)));

const removeRow = (rowIndex: number) =>
    setRows(rows.value.filter((_, r) => r !== rowIndex));

const focusInput = (element: Element | null | undefined) => {
    if (element instanceof HTMLInputElement) {
        element.focus();
        element.scrollIntoView();
    }
};

const cellInputAt = (row: Element | null | undefined, cellIndex: number) =>
    row?.querySelector(`td:nth-child(${cellIndex + 1}) input`);

const handleCellKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLInputElement;
    const cell = target.closest("td");
    const row = cell?.closest("tr");
    if (!cell || !row) {
        return;
    }
    const cellIndex = Array.from(row.children).indexOf(cell);
    const atStart = target.selectionStart === 0 && target.selectionEnd === 0;
    const atEnd =
        target.selectionStart === target.value.length &&
        target.selectionEnd === target.value.length;

    if (event.key === "Enter") {
        addRow();
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusInput(cellInputAt(row.previousElementSibling, cellIndex));
    } else if (event.key === "ArrowDown") {
        event.preventDefault();
        focusInput(cellInputAt(row.nextElementSibling, cellIndex));
    } else if (event.key === "ArrowLeft" && atStart) {
        event.preventDefault();
        focusInput(cell.previousElementSibling?.querySelector("input"));
    } else if (event.key === "ArrowRight" && atEnd) {
        event.preventDefault();
        focusInput(cell.nextElementSibling?.querySelector("input"));
    }
};

// Tab on the last row's remove button adds a row and moves into it.
const handleRemoveKeyDown = async (event: KeyboardEvent) => {
    const button = event.target as HTMLElement;
    const cell = button.closest("td");
    const row = button.closest("tr");

    if (event.key === "Tab") {
        event.preventDefault();
        const lastRow = row?.parentElement?.querySelector(
            "tr:nth-last-child(2)",
        );
        if (lastRow === row) {
            addRow();
            await nextTick();
        }
        focusInput(
            row?.nextElementSibling?.querySelector("td:first-child input"),
        );
    } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusInput(cell?.previousElementSibling?.querySelector("input"));
    }
};

onMounted(() => emit("insertDataChange", { rows: rows.value }));
</script>

<template>
    <div class="py-2 max-md:text-sm">
        Insert a table by providing the rows and columns.
    </div>
    <div class="py-2">
        <table>
            <tbody>
                <tr>
                    <template v-if="rows.length > 0">
                        <td
                            v-for="(_, index) in rows[0]"
                            :key="index"
                            class="text-center"
                        >
                            <Button
                                color="transparentDanger"
                                size="sm"
                                @click="removeColumn(index)"
                            >
                                <Icon name="minus" size="sm" />
                            </Button>
                        </td>
                        <td>
                            <Button
                                color="success"
                                size="sm"
                                title="Add column"
                                @click="addColumn"
                            >
                                <Icon name="plus" size="sm" />
                            </Button>
                        </td>
                    </template>
                </tr>
                <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
                    <td
                        v-for="(cell, cellIndex) in row"
                        :key="cellIndex"
                        class="min-w-36"
                    >
                        <Input
                            :model-value="cell"
                            @update:model-value="
                                setCell(rowIndex, cellIndex, $event)
                            "
                            @keydown="handleCellKeyDown"
                        />
                    </td>
                    <td>
                        <Button
                            color="transparentDanger"
                            size="sm"
                            title="Remove row"
                            @click="removeRow(rowIndex)"
                            @keydown="handleRemoveKeyDown"
                        >
                            <Icon name="minus" size="sm" />
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td
                        :colspan="rows.length > 0 ? rows[0]!.length + 1 : 1"
                        class="text-center"
                    >
                        <Button
                            color="success"
                            size="sm"
                            title="Add row"
                            @click="addRow"
                        >
                            <Icon name="plus" size="sm" />
                        </Button>
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="pt-5">
            <Button color="danger" @click="setRows([['', '']])">
                Reset table
            </Button>
        </div>
    </div>
</template>
