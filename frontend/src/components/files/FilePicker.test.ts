import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import type { FileMetaRecord } from "@/types/records";
import FilePicker from "./FilePicker.vue";

const items = (wrapper: VueWrapper) => wrapper.findAll(".group");

const mountPicker = async () => {
    const wrapper = mount(FilePicker, { attachTo: document.body });
    await vi.waitFor(() => expect(items(wrapper)).toHaveLength(2));
    return wrapper;
};

const picked = (wrapper: VueWrapper) =>
    (wrapper.emitted("filesPicked")?.at(-1)?.[0] as FileMetaRecord[]).map(
        (file) => file.name,
    );

describe("FilePicker", () => {
    beforeEach(async () => {
        // jsdom has no modal dialogs.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("picks one file on click and several with Ctrl", async () => {
        const wrapper = await mountPicker();
        const [first, second] = items(wrapper);

        await first!.trigger("click");
        expect(picked(wrapper)).toEqual(["architecture.png"]);

        await second!.trigger("click", { ctrlKey: true });
        expect(picked(wrapper)).toEqual([
            "architecture.png",
            "notes-export.zip",
        ]);

        await first!.trigger("click", { ctrlKey: true });
        expect(picked(wrapper)).toEqual(["notes-export.zip"]);
    });

    it("toggles visibility and deletes after confirmation", async () => {
        const wrapper = await mountPicker();

        await wrapper
            .get('button[title="Make this file visible to everyone"]')
            .trigger("click");
        await vi.waitFor(() =>
            expect(
                mockControl.state.files.find(
                    (f) => f.identifier === "mock-file-2",
                )?.is_public,
            ).toBe(true),
        );

        await wrapper
            .findAll('button[title="Delete this file"]')[0]!
            .trigger("click");
        expect(wrapper.text()).toContain(
            "Are you sure you want to delete 'architecture.png' file?",
        );
        await wrapper
            .findAll("button")
            .find((b) => b.text() === "Delete this file")!
            .trigger("click");
        await flushPromises();
        await vi.waitFor(() => expect(items(wrapper)).toHaveLength(1));
        expect(
            mockControl.state.files.some((f) => f.identifier === "mock-file-1"),
        ).toBe(false);
    });

    it("starts in the grid and switches to the list", async () => {
        const wrapper = await mountPicker();
        const viewButton = (name: string) =>
            wrapper.get(`[aria-label="File view"] button[title="${name}"]`);
        expect(viewButton("Grid view").attributes("aria-pressed")).toBe("true");
        expect(wrapper.find("table").exists()).toBe(false);

        await viewButton("List view").trigger("click");
        expect(items(wrapper)).toHaveLength(0);
        const names = wrapper.findAll("tbody .file-name");
        expect(names.map((name) => name.text())).toEqual([
            "architecture.png",
            "notes-export.zip",
        ]);

        await names[0]!.trigger("click");
        await names[1]!.trigger("click", { ctrlKey: true });
        expect(picked(wrapper)).toEqual([
            "architecture.png",
            "notes-export.zip",
        ]);
        await names[1]!.trigger("dblclick");
        expect(
            (wrapper.emitted("fileActivated")?.at(-1)?.[0] as FileMetaRecord)
                .name,
        ).toBe("notes-export.zip");
    });

    it("has the file filters and the upload dialog", async () => {
        const wrapper = await mountPicker();
        expect(wrapper.find('[aria-label="Visibility"]').exists()).toBe(true);
        expect(wrapper.find("select").text()).toContain("All types");

        await wrapper
            .findAll("button")
            .find((b) => b.text().trim() === "Upload")!
            .trigger("click");
        expect(wrapper.find('[data-testid="upload-input"]').exists()).toBe(
            true,
        );
    });
});
