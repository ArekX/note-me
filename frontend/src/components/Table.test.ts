import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import Table, { type TableColumn } from "./Table.vue";

interface Row {
    id: number;
    name: string;
}

const columns: TableColumn<Row>[] = [
    { id: "name", name: "Name", key: "name", filter: true },
    { id: "actions", name: "Actions", headerClass: "w-1/6" },
];

describe("Table", () => {
    it("renders key columns as text and the rest through slots", () => {
        const wrapper = mount(Table<Row>, {
            props: {
                columns,
                rows: [
                    { id: 1, name: "First" },
                    { id: 2, name: "Second" },
                ],
            },
            slots: {
                "cell-actions": ({ row }: { row: Row }) =>
                    h("button", `Edit ${row.id}`),
                "filter-name": () => h("input", { class: "name-filter" }),
            },
        });

        expect(wrapper.findAll("th").map((th) => th.text())).toEqual([
            "Name",
            "Actions",
        ]);
        expect(wrapper.get("th:last-child").classes()).toContain("w-1/6");
        const rows = wrapper.findAll("tbody tr");
        expect(rows.map((row) => row.text())).toEqual([
            "FirstEdit 1",
            "SecondEdit 2",
        ]);
        expect(wrapper.find("tr.filters .name-filter").exists()).toBe(true);
    });

    it("shows skeleton rows instead of rows while loading", () => {
        const wrapper = mount(Table<Row>, {
            props: {
                columns,
                rows: [{ id: 1, name: "First" }],
                isLoading: true,
                skeletonRows: 3,
            },
        });
        expect(wrapper.text()).not.toContain("First");
        const rows = wrapper.findAll("tbody tr");
        expect(rows).toHaveLength(3);
        expect(rows[0]!.findAll("td")).toHaveLength(2);
        expect(rows[0]!.findAll(".skeleton")).toHaveLength(2);
    });

    it("shows the no rows text for an empty list", () => {
        const wrapper = mount(Table<Row>, {
            props: {
                columns: [columns[1]!],
                rows: [],
                noRowsText: "Nothing here.",
            },
        });
        expect(wrapper.get("tbody").text()).toBe("Nothing here.");
        expect(wrapper.find("tr.filters").exists()).toBe(false);
    });
});
