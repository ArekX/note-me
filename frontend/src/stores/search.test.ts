import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
    RestoreDeletedNoteMessage,
    RestoreDeletedNoteResponse,
} from "@/types/messages";
import type { NoteSearchRecord } from "@/types/records";
import { useNotesStore } from "./notes";
import { useSearchStore } from "./search";
import { useSocketStore } from "./socket";

const titles = (store: ReturnType<typeof useSearchStore>) =>
    (store.results as NoteSearchRecord[]).map((r) => r.title);

const settle = (store: ReturnType<typeof useSearchStore>) =>
    vi.waitFor(
        () => {
            if (
                store.isRunning ||
                (store.hasMore && store.results.length === 0)
            ) {
                throw new Error("search still running");
            }
        },
        { timeout: 2000 },
    );

describe("search store", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSearchStore().resetSearch();
        useSocketStore().disconnect();
    });

    it("searches by query and resets", async () => {
        const store = useSearchStore();
        expect(store.isActive).toBe(false);

        store.setQuery("weekly");
        expect(store.isActive).toBe(true);
        await settle(store);
        expect(titles(store)).toEqual(["Weekly sync 2026-10-06"]);
        expect(store.hasMore).toBe(false);

        store.resetSearch();
        expect(store.isActive).toBe(false);
        expect(store.results).toEqual([]);
    });

    it("filters by a group with its subgroups and by any of the tags", async () => {
        const store = useSearchStore();

        store.setGroup({ id: 1, name: "Work" });
        await settle(store);
        expect(titles(store)).toEqual([
            "NoteMe Go rewrite plan",
            "Weekly sync 2026-10-06",
        ]);

        store.setFilters({ group: null, tags: ["idea", "go"] });
        await settle(store);
        expect(titles(store)).toEqual([
            "NoteMe Go rewrite plan",
            "Book list",
            "Unsorted thoughts",
        ]);
    });

    it("loads further pages and reloads when a note is created", async () => {
        const notes = useNotesStore();
        const store = useSearchStore();
        await store.init();

        for (let i = 0; i < 11; i++) {
            await notes.createNote({
                title: `Paged ${i}`,
                text: "",
                is_encrypted: false,
                tags: [],
                group_id: null,
            });
        }

        store.setQuery("paged");
        await settle(store);
        expect(store.results).toHaveLength(10);
        expect(store.hasMore).toBe(true);

        await store.loadMore();
        expect(store.results).toHaveLength(11);
        expect(store.hasMore).toBe(false);

        await notes.createNote({
            title: "Paged last",
            text: "",
            is_encrypted: false,
            tags: [],
            group_id: null,
        });
        await vi.waitFor(() => expect(store.results).toHaveLength(10));
        await store.loadMore();
        expect(titles(store).at(-1)).toBe("Paged last");
    });

    it("searches the recycle bin and reloads when a note is restored", async () => {
        const store = useSearchStore();
        await store.init();
        store.setType("recycleBin");

        store.setQuery("shopping");
        await settle(store);
        expect(titles(store)).toEqual(["Old shopping list"]);

        await (
            await useSocketStore().getService()
        ).sendMessage<RestoreDeletedNoteMessage, RestoreDeletedNoteResponse>(
            "notes",
            "restoreDeletedNote",
            {
                data: { id: 5 },
                expect: "restoreDeletedNoteResponse",
            },
        );
        await vi.waitFor(() => expect(store.hasMore).toBe(false));
        expect(store.results).toEqual([]);
    });
});
