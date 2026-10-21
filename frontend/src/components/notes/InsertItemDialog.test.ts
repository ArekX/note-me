import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { useSocketStore } from "@/stores/socket";
import InsertItemDialog from "./InsertItemDialog.vue";
import type { InsertComponentId } from "./insert/insert-components";

const openDialog = async (itemId: InsertComponentId) => {
    const wrapper = mount(InsertItemDialog, {
        props: { itemId },
        attachTo: document.body,
    });
    await flushPromises();
    return wrapper;
};

const clickButton = async (wrapper: VueWrapper, text: string) => {
    const button = wrapper.findAll("button").find((b) => b.text() === text);
    await button!.trigger("click");
    await flushPromises();
};

describe("InsertItemDialog", () => {
    beforeEach(async () => {
        // jsdom has no modal dialogs or layout.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        Element.prototype.scrollIntoView = vi.fn();
        vi.stubGlobal(
            "IntersectionObserver",
            class {
                observe() {}
                disconnect() {}
            },
        );
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("builds a table from the grid", async () => {
        const wrapper = await openDialog("table");
        expect(wrapper.get("dialog").text()).toContain("Insert table");

        const inputs = wrapper.findAll("td input");
        await inputs[0]!.setValue("Name");
        await inputs[1]!.setValue("Qty");
        await wrapper.get('button[title="Add row"]').trigger("click");
        const cells = wrapper.findAll("td input");
        await cells[2]!.setValue("Apples");
        await cells[3]!.setValue("3");
        await clickButton(wrapper, "Insert");

        expect(wrapper.emitted("insert")).toEqual([
            ["| Name   | Qty    |\n| ------ | ------ |\n| Apples | 3      |"],
        ]);
    });

    it("inserts a link to a note picked from the search list", async () => {
        const wrapper = await openDialog("note-link");
        await vi.waitFor(() => {
            if (!wrapper.text().includes("Book list")) {
                throw new Error("results not loaded");
            }
        });

        const item = wrapper
            .findAll(".truncate")
            .find((el) => el.text() === "Book list");
        (item!.element.closest(".cursor-pointer") as HTMLElement).click();
        await flushPromises();
        await clickButton(wrapper, "Insert Link");

        expect(wrapper.emitted("insert")?.[0]?.[0]).toMatch(
            /^\{:note-link\|\d+\}$/,
        );
    });

    it("closes without inserting on cancel", async () => {
        const wrapper = await openDialog("note-list");
        expect(wrapper.findAll("button").map((b) => b.text())).not.toContain(
            "Insert List",
        );
        await clickButton(wrapper, "Cancel");
        expect(wrapper.emitted("close")).toHaveLength(1);
        expect(wrapper.emitted("insert")).toBeUndefined();
    });

    it("inserts a double-clicked file by its type and lists player options", async () => {
        const wrapper = await openDialog("file");
        await vi.waitFor(() =>
            expect(wrapper.findAll(".group")).toHaveLength(2),
        );
        const [image, archive] = wrapper.findAll(".group");

        await image!.trigger("dblclick");
        await archive!.trigger("dblclick");
        expect(wrapper.emitted("insert")).toEqual([
            ["![architecture.png](/file/mock-file-1)"],
            ["[notes-export.zip](/file/mock-file-2?download)"],
        ]);

        await image!.trigger("click");
        await flushPromises();
        await clickButton(wrapper, "Insert as");
        expect(wrapper.text()).toContain("Audio player");
        expect(wrapper.text()).toContain("Video player");
    });
});
