import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import ImportNotes from "./ImportNotes.vue";

describe("ImportNotes", () => {
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

    it("creates a note per file, titled with the file name", async () => {
        const wrapper = mount(ImportNotes, { attachTo: document.body });
        const before = mockControl.state.notes.length;

        await wrapper.get("button").trigger("click");
        await flushPromises();

        const input = wrapper.get('input[type="file"]');
        const files = [
            new File(["# First"], "first.md", { type: "text/markdown" }),
            new File(["second text"], "second.txt", { type: "text/plain" }),
        ];
        Object.defineProperty(input.element, "files", { value: files });
        await input.trigger("change");

        await vi.waitFor(() =>
            expect(useToastStore().messages.at(-1)?.text).toBe(
                "File import completed.",
            ),
        );
        const created = mockControl.state.notes.slice(before);
        expect(created.map((note) => [note.title, note.note])).toEqual([
            ["first.md", "# First"],
            ["second.txt", "second text"],
        ]);
        expect(created.every((note) => note.group_id === null)).toBe(true);
    });
});
