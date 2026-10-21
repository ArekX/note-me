import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSidebar } from "@/composables/useSidebar";
import { useNotesStore } from "@/stores/notes";
import type {
    DeleteNoteMessage,
    DeleteNoteResponse,
    RestoreDeletedNoteMessage,
    RestoreDeletedNoteResponse,
} from "@/types/messages";
import { useSocketStore } from "@/stores/socket";
import NoteLink from "./NoteLink.vue";

const mountLink = async (noteId: number) => {
    const wrapper = mount(NoteLink, { props: { noteId } });
    await vi.waitFor(() => {
        if (!wrapper.find("button.note-link").exists()) {
            throw new Error("still loading");
        }
    });
    return wrapper;
};

describe("NoteLink", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("shows the live title of the note", async () => {
        const wrapper = await mountLink(3);
        expect(wrapper.text()).toBe("Book list");

        await useNotesStore().updateNote(3, { title: "Reading list" });
        await flushPromises();
        expect(wrapper.text()).toBe("Reading list");
    });

    it("marks a missing note", async () => {
        const wrapper = await mountLink(999);
        expect(wrapper.text()).toBe("Note #999 not found");
        expect(wrapper.get("button").classes()).toContain("note-link-missing");
        expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    });

    it("marks a note in the recycle bin and opens the recycle bin", async () => {
        mockControl.state.notes.find((n) => n.id === 3)!.is_deleted = true;
        const wrapper = await mountLink(3);
        const card = wrapper.get("button");
        expect(card.classes()).toContain("note-link-deleted");
        expect(card.text()).toContain("Book list");
        expect(card.text()).toContain("In recycle bin");
        expect(card.attributes("disabled")).toBeUndefined();

        const sidebar = useSidebar();
        sidebar.show("notes");
        await card.trigger("click");
        expect(sidebar.section.value).toBe("recycleBin");
    });

    it("follows the note into the recycle bin and back", async () => {
        const wrapper = await mountLink(3);
        expect(wrapper.get("button").classes()).not.toContain(
            "note-link-deleted",
        );
        const service = await useSocketStore().getService();

        await service.sendMessage<DeleteNoteMessage, DeleteNoteResponse>(
            "notes",
            "deleteNote",
            {
                data: { id: 3 },
                expect: "deleteNoteResponse",
            },
        );
        await vi.waitFor(() =>
            expect(wrapper.get("button").classes()).toContain(
                "note-link-deleted",
            ),
        );

        await service.sendMessage<
            RestoreDeletedNoteMessage,
            RestoreDeletedNoteResponse
        >("notes", "restoreDeletedNote", {
            data: { id: 3 },
            expect: "restoreDeletedNoteResponse",
        });
        await vi.waitFor(() =>
            expect(wrapper.get("button").classes()).not.toContain(
                "note-link-deleted",
            ),
        );
    });
});
