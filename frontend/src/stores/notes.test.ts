import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useNotesStore } from "./notes";
import { useSocketStore } from "./socket";

describe("notes store", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("creates a note and loads it with its group and normalised tags", async () => {
        const store = useNotesStore();

        const { record, group_id } = await store.createNote({
            title: "Plan",
            text: "# Plan",
            is_encrypted: false,
            tags: ["Work", "work", "two words"],
            group_id: 2,
        });
        expect(group_id).toBe(2);
        expect(record.last_open_at).toBeNull();

        const note = await store.getNote(record.id);
        expect(note).toMatchObject({
            title: "Plan",
            note: "# Plan",
            group_id: 2,
            tags: ["work", "twowords"],
        });
    });

    it("marks a note opened only when asked", async () => {
        const store = useNotesStore();
        const { record } = await store.createNote({
            title: "Fresh",
            text: "",
            is_encrypted: false,
            tags: [],
            group_id: null,
        });

        await store.getNote(record.id);
        expect((await store.getRecentlyOpened())[0]?.id).not.toBe(record.id);

        await store.getNote(record.id, true);
        expect((await store.getRecentlyOpened())[0]?.id).toBe(record.id);
    });

    it("updates, moves and deletes a note", async () => {
        const store = useNotesStore();

        const { updated_data } = await store.updateNote(1, {
            title: "Renamed",
            group_id: null,
        });
        expect(updated_data).toEqual({ title: "Renamed", group_id: null });
        expect(await store.getNote(1)).toMatchObject({
            title: "Renamed",
            group_id: null,
            group_name: null,
        });

        await store.deleteNote(1);
        await expect(store.getNote(1)).rejects.toMatchObject({
            data: { message: "Requested note not found." },
        });
        await expect(store.deleteNote(1)).rejects.toMatchObject({
            data: { message: "Note does not exist." },
        });
    });

    it("returns details with excluded fields empty", async () => {
        const details = await useNotesStore().getDetails(1, {
            include_title: true,
        });
        expect(details).toMatchObject({
            title: "NoteMe Go rewrite plan",
            group_id: 0,
            group_name: "",
            note: "",
            created_at: 0,
        });
    });
});
