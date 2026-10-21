import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { h } from "vue";
import { useLoadMore } from "@/composables/useLoadMore";
import SidebarList from "./SidebarList.vue";

interface Row {
    id: number;
    name: string;
}

describe("SidebarList", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "IntersectionObserver",
            class {
                observe() {}
                disconnect() {}
            },
        );
    });

    it("shows a skeleton instead of the empty message while the first page loads", async () => {
        let resolve: (rows: Row[]) => void = () => {};
        const list = useLoadMore<Row>({
            limit: 10,
            onLoadMore: () => new Promise((done) => (resolve = done)),
        });
        const wrapper = mount(SidebarList<Row>, {
            props: { list, emptyIcon: "note", recordKey: (row: Row) => row.id },
            slots: {
                empty: () => "Nothing here",
                default: ({ record }: { record: Row }) => h("div", record.name),
            },
        });
        await flushPromises();

        expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
        expect(wrapper.text()).not.toContain("Nothing here");

        resolve([{ id: 1, name: "First" }]);
        await flushPromises();

        expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
        expect(wrapper.text()).toContain("First");
    });
});
