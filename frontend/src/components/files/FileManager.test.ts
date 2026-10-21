import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import FileManager from "./FileManager.vue";

const addFiles = async (wrapper: VueWrapper, files: File[]) => {
    const input = wrapper.get('[data-testid="upload-input"]');
    Object.defineProperty(input.element, "files", {
        value: files,
        configurable: true,
    });
    await input.trigger("change");
};

const listed = (wrapper: VueWrapper) =>
    wrapper.findAll("dialog li").map((item) => item.text());

const button = (wrapper: VueWrapper, text: string) =>
    wrapper.findAll("button").find((b) => b.text().trim() === text)!;

describe("FileManager", () => {
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

    it("uploads the files added in the upload dialog", async () => {
        const wrapper = mount(FileManager, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("architecture.png"),
        );
        expect(wrapper.find("dialog").exists()).toBe(false);

        await button(wrapper, "Upload").trigger("click");
        expect(wrapper.get("dialog").text()).toContain("No files added yet.");
        expect(button(wrapper, "Upload files").attributes()).toHaveProperty(
            "disabled",
        );

        const first = new File(["first"], "first.txt", { type: "text/plain" });
        const second = new File(["second!"], "second.png", {
            type: "image/png",
        });
        await addFiles(wrapper, [first, second]);
        await addFiles(wrapper, [first]);
        expect(listed(wrapper)).toHaveLength(2);
        expect(listed(wrapper)[0]).toContain("first.txt");
        expect(listed(wrapper)[1]).toContain("second.png");
        expect(wrapper.get("dialog").text()).toContain("2 files");

        await wrapper
            .findAll('dialog li button[title="Remove"]')[1]!
            .trigger("click");
        expect(listed(wrapper)).toHaveLength(1);

        await button(wrapper, "Upload 1 file").trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.get("dialog li").attributes("data-status")).toBe(
                "done",
            ),
        );
        expect(wrapper.get("dialog li").text()).toContain("Uploaded");
        expect(wrapper.get('[data-testid="upload-summary"]').text()).toBe(
            "1 of 1 uploaded",
        );
        expect(wrapper.find('[data-testid="upload-input"]').exists()).toBe(
            false,
        );
        const names = mockControl.state.files.map((file) => file.name);
        expect(names).toContain("first.txt");
        expect(names).not.toContain("second.png");
        await vi.waitFor(() =>
            expect(wrapper.get("tbody").text()).toContain("first.txt"),
        );

        await button(wrapper, "Close").trigger("click");
        expect(wrapper.find("dialog").exists()).toBe(false);
    });

    it("shows the outcome of each file", async () => {
        const wrapper = mount(FileManager, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("architecture.png"),
        );
        await button(wrapper, "Upload").trigger("click");

        const tooBig = new File(["x"], "huge.bin");
        Object.defineProperty(tooBig, "size", { value: 60_000_000 });
        await addFiles(wrapper, [
            tooBig,
            new File(["ok"], "small.txt", { type: "text/plain" }),
        ]);
        await button(wrapper, "Upload 2 files").trigger("click");

        await vi.waitFor(() =>
            expect(
                wrapper
                    .findAll("dialog li")
                    .map((item) => item.attributes("data-status")),
            ).toEqual(["failed", "done"]),
        );
        expect(wrapper.findAll("dialog li")[0]!.text()).toContain(
            "File size is over the allowable limit.",
        );
        expect(wrapper.get('[data-testid="upload-summary"]').text()).toBe(
            "1 of 2 uploaded, 1 failed",
        );
    });

    it("starts in the list and switches to the grid", async () => {
        const wrapper = mount(FileManager, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("architecture.png"),
        );
        const viewButton = (name: string) =>
            wrapper.get(`[aria-label="File view"] button[title="${name}"]`);
        expect(viewButton("List view").attributes("aria-pressed")).toBe("true");
        expect(wrapper.find("table").exists()).toBe(true);

        await viewButton("Grid view").trigger("click");
        expect(wrapper.find("table").exists()).toBe(false);
        const cards = wrapper.findAll(".group");
        expect(cards).toHaveLength(2);
        expect(cards[0]!.classes()).toContain("glass-card");

        await cards[0]!.trigger("click");
        expect(wrapper.text()).toContain("1 file selected");
        await cards[1]!.trigger("click", { ctrlKey: true });
        expect(wrapper.text()).toContain("2 files selected");
    });

    it("opens the upload dialog with dropped files", async () => {
        const wrapper = mount(FileManager, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("architecture.png"),
        );

        const dropped = new File(["x"], "dropped.md", {
            type: "text/markdown",
        });
        await wrapper.trigger("drop", {
            dataTransfer: { files: [dropped], types: ["Files"] },
        });
        expect(listed(wrapper)).toHaveLength(1);
        expect(listed(wrapper)[0]).toContain("dropped.md");
        expect(mockControl.state.files.map((f) => f.name)).not.toContain(
            "dropped.md",
        );
    });

    it("changes visibility of and deletes the selected files", async () => {
        const wrapper = mount(FileManager, {
            props: { adminMode: true },
            attachTo: document.body,
        });
        await vi.waitFor(() =>
            expect(wrapper.findAll("tbody tr")).toHaveLength(2),
        );
        const selectAll = wrapper.get('thead input[type="checkbox"]');
        const rowBoxes = () => wrapper.findAll('tbody input[type="checkbox"]');
        expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);

        await rowBoxes()[1]!.setValue(true);
        expect(wrapper.get('[role="toolbar"]').text()).toContain(
            "1 file selected",
        );
        expect((selectAll.element as HTMLInputElement).indeterminate).toBe(
            true,
        );

        await selectAll.setValue(true);
        expect(wrapper.get('[role="toolbar"]').text()).toContain(
            "2 files selected",
        );
        expect(
            rowBoxes().every(
                (box) => (box.element as HTMLInputElement).checked,
            ),
        ).toBe(true);

        await button(wrapper, "Make private").trigger("click");
        await vi.waitFor(() =>
            expect(
                mockControl.state.files.map((file) => file.is_public),
            ).toEqual([false, false]),
        );
        await vi.waitFor(() =>
            expect(wrapper.get("tbody").text()).not.toContain("Public"),
        );

        await button(wrapper, "Delete").trigger("click");
        expect(wrapper.get("dialog").text()).toContain(
            "delete 2 selected files",
        );
        await button(wrapper, "Delete 2 files").trigger("click");
        await vi.waitFor(() => expect(mockControl.state.files).toHaveLength(0));
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("No files found."),
        );
        expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);
    });
});
