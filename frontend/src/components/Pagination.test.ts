import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Pagination from "./Pagination.vue";

const pageLabels = (total: number, currentPage: number) =>
    mount(Pagination, { props: { total, perPage: 20, currentPage } })
        .findAll("button")
        .map((button) => button.text())
        .filter(Boolean);

describe("Pagination", () => {
    it("is hidden when everything fits on one page", () => {
        const wrapper = mount(Pagination, {
            props: { total: 20, perPage: 20, currentPage: 1 },
        });
        expect(wrapper.find("button").exists()).toBe(false);
    });

    it("shows a nine page window padded to the widest number", () => {
        expect(pageLabels(20 * 15, 1)).toEqual([
            "01",
            "02",
            "03",
            "04",
            "05",
            "06",
            "07",
            "08",
            "09",
        ]);
        expect(pageLabels(20 * 15, 8)).toEqual([
            "04",
            "05",
            "06",
            "07",
            "08",
            "09",
            "10",
            "11",
            "12",
        ]);
        expect(pageLabels(20 * 15, 15)).toEqual([
            "07",
            "08",
            "09",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
        ]);
        expect(pageLabels(20 * 3, 2)).toEqual(["1", "2", "3"]);
    });

    it("emits the chosen page and disables the edges", async () => {
        const wrapper = mount(Pagination, {
            props: { total: 100, perPage: 20, currentPage: 1 },
        });
        expect(
            wrapper.get('button[title="Previous page"]').attributes("disabled"),
        ).toBeDefined();

        await wrapper.get('button[title="Next page"]').trigger("click");
        await wrapper.get('button[title="Last page"]').trigger("click");
        expect(wrapper.emitted("change")).toEqual([[2], [5]]);
    });
});
