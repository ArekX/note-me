import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useNotesStore } from "@/stores/notes";
import { useSocketStore } from "@/stores/socket";
import type { FullyDeleteNoteResponse } from "@/types/messages";
import RecycleBinList from "./RecycleBinList.vue";

const mountList = async () => {
    const wrapper = mount(RecycleBinList, { attachTo: document.body });
    await vi.waitFor(() => {
        if (wrapper.find('[aria-busy="true"]').exists()) {
            throw new Error("still loading");
        }
    });
    return wrapper;
};

const confirmAction = async (
    wrapper: ReturnType<typeof mount>,
    title: string,
    confirmText: string,
) => {
    await wrapper.get(`button[title="${title}"]`).trigger("click");
    const confirm = wrapper
        .findAll("button")
        .find((b) => b.text() === confirmText);
    await confirm!.trigger("click");
    await flushPromises();
};

describe("RecycleBinList", () => {
    beforeEach(async () => {
        // jsdom has no modal dialogs or intersection observer.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
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

    it("lists deleted notes and picks up newly deleted ones", async () => {
        const wrapper = await mountList();
        expect(wrapper.text()).toContain("Old shopping list");

        await useNotesStore().deleteNote(3);
        await vi.waitFor(() => expect(wrapper.text()).toContain("Book list"));
    });

    it("restores a note to the top level", async () => {
        const wrapper = await mountList();
        await confirmAction(wrapper, "Restore note", "Restore note");

        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("You have no deleted notes."),
        );
        expect(mockControl.state.notes.find((n) => n.id === 5)).toMatchObject({
            is_deleted: false,
            group_id: null,
        });
    });

    it("fully deletes a note and drops notes expired elsewhere", async () => {
        await useNotesStore().deleteNote(3);
        const wrapper = await mountList();
        expect(wrapper.text()).toContain("Book list");

        await confirmAction(wrapper, "Fully delete note", "Fully delete note");
        await vi.waitFor(() =>
            expect(wrapper.text()).not.toContain("Book list"),
        );
        expect(mockControl.state.notes.some((n) => n.id === 3)).toBe(false);

        mockControl.push<FullyDeleteNoteResponse>(
            "notes",
            "fullyDeleteNoteResponse",
            { deleted_id: 5 },
        );
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("You have no deleted notes."),
        );
    });
});
