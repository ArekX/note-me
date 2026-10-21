import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "@/test/mock-backend";
import type {
    CreateGroupResponse,
    CreateNoteResponse,
    RevertNoteToHistoryResponse,
    UpdateGroupResponse,
    UpdateNoteResponse,
} from "@/types/messages";
import { ROOT_KEY, useTreeStore } from "./tree";
import { useSocketStore } from "./socket";
import { useToastStore } from "./toast";

const keys = (key: string) =>
    useTreeStore()
        .childrenOf(key)
        .map((node) => node.key);

const settle = () =>
    vi.waitFor(() => expect(mockControl.log[0]?.direction).toBe("in"));

const flush = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("tree store", () => {
    beforeEach(async () => {
        localStorage.clear();
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("loads the top level with groups before notes and persists it", async () => {
        const store = useTreeStore();
        await store.init();

        expect(keys(ROOT_KEY)).toEqual([
            "group-1",
            "group-4",
            "group-5",
            "note-6",
        ]);
        expect(store.nodes["group-1"]?.children_loaded).toBe(false);

        await flush();
        const saved = JSON.parse(localStorage.getItem("treeStorage")!);
        expect(saved.nodes[ROOT_KEY].children).toEqual(keys(ROOT_KEY));
    });

    it("loads a group lazily on open and keeps it loaded when closed", async () => {
        const store = useTreeStore();
        await store.init();

        await store.toggle("group-1");
        expect(store.isOpen("group-1")).toBe(true);
        expect(keys("group-1")).toEqual(["group-2", "group-3"]);

        await store.toggle("group-1");
        expect(store.isOpen("group-1")).toBe(false);
        expect(keys("group-1")).toEqual(["group-2", "group-3"]);
    });

    it("replaces the unsaved editor node with the created group", async () => {
        const store = useTreeStore();
        await store.init();

        await store.startNewGroup("group-1");
        const [editorKey] = keys("group-1").filter((key) =>
            key.startsWith("new-"),
        );
        expect(store.isEditing(editorKey!)).toBe(true);

        await store.saveName(editorKey!, "Archive");
        await flush();

        const created = store.childrenOf("group-1").at(-1)!;
        expect(created.name).toBe("Archive");
        expect(keys("group-1")).toEqual(["group-2", "group-3", created.key]);
        expect(store.nodes[editorKey!]).toBeUndefined();
    });

    it("refuses drops into the group itself, its subgroups or its parent", async () => {
        const store = useTreeStore();
        await store.init();
        await store.open("group-1");

        expect(store.canDropTo("group-1", "group-1")).toBe(false);
        expect(store.canDropTo("group-1", "group-2")).toBe(false);
        expect(store.canDropTo("group-2", "group-1")).toBe(false);
        expect(store.canDropTo("group-2", "note-6")).toBe(false);
        expect(store.canDropTo("note-6", ROOT_KEY)).toBe(false);
        expect(store.canDropTo("note-6", "group-4")).toBe(true);
        expect(store.canDropTo("group-2", "group-4")).toBe(true);
        expect(store.canDropTo("group-2", ROOT_KEY)).toBe(true);
    });

    it("moves a dropped group into the target and opens it", async () => {
        const store = useTreeStore();
        await store.init();
        await store.open("group-1");

        await store.dropItem("group-2", "group-4");

        expect(keys("group-1")).toEqual(["group-3"]);
        expect(store.isOpen("group-4")).toBe(true);
        expect(keys("group-4")).toEqual(["group-2", "note-3", "note-4"]);
        expect(store.nodes["group-2"]?.parent).toBe("group-4");
    });

    it("reports a move the server rejects", async () => {
        const store = useTreeStore();
        await store.init();

        await expect(store.moveGroup(1, 2)).rejects.toMatchObject({
            data: { message: "Group cannot be moved into its own subgroup" },
        });
        await store.dropItem("group-4", "group-4");
        expect(useToastStore().messages).toHaveLength(0);
    });

    it("applies changes pushed from another tab", async () => {
        const store = useTreeStore();
        await store.init();
        await store.open("group-1");

        mockControl.push<UpdateGroupResponse>("groups", "updateGroupResponse", {
            updated_id: 3,
            updated_data: { name: "Standups", parent_id: null },
        });
        mockControl.push<CreateGroupResponse>("groups", "createGroupResponse", {
            record: {
                id: 50,
                name: "Hidden",
                parent_id: 5,
                created_at: 0,
                has_subgroups: null,
                has_notes: null,
            },
        });
        await settle();
        await flush();

        expect(store.nodes["group-3"]?.name).toBe("Standups");
        expect(keys(ROOT_KEY)).toEqual([
            "group-1",
            "group-3",
            "group-4",
            "group-5",
            "note-6",
        ]);
        expect(store.nodes["group-50"]).toBeDefined();
        expect(store.nodes["group-5"]?.has_children).toBe(true);
    });

    it("moves a dropped note and renames a note", async () => {
        const store = useTreeStore();
        await store.init();

        await store.dropItem("note-6", "group-4");
        expect(keys("group-4")).toEqual(["note-3", "note-4", "note-6"]);
        expect(keys(ROOT_KEY)).not.toContain("note-6");

        store.startEdit("note-6");
        await store.saveName("note-6", "Renamed");
        expect(store.nodes["note-6"]?.name).toBe("Renamed");
        expect(store.isEditing("note-6")).toBe(false);
    });

    it("applies note changes pushed from another tab", async () => {
        const store = useTreeStore();
        await store.init();
        await store.open("group-4");

        mockControl.push<CreateNoteResponse>("notes", "createNoteResponse", {
            record: {
                id: 60,
                title: "New",
                note: "",
                is_encrypted: false,
                is_wide: true,
                user_id: 1,
                created_at: 0,
                updated_at: 0,
                last_open_at: null,
            },
            group_id: null,
        });
        mockControl.push<UpdateNoteResponse>("notes", "updateNoteResponse", {
            updated_id: 3,
            updated_data: { title: "Moved", group_id: null },
        });
        mockControl.push<RevertNoteToHistoryResponse>(
            "notes",
            "revertNoteToHistoryResponse",
            {
                note_id: 4,
                title: "Reverted",
                note: "",
                is_encrypted: true,
                tags: [],
            },
        );
        await settle();
        await flush();

        expect(keys(ROOT_KEY)).toEqual([
            "group-1",
            "group-4",
            "group-5",
            "note-3",
            "note-6",
            "note-60",
        ]);
        expect(store.nodes["note-3"]?.name).toBe("Moved");
        expect(keys("group-4")).toEqual(["note-4"]);
        expect(store.nodes["note-4"]).toMatchObject({
            name: "Reverted",
            is_protected: true,
        });
    });

    it("removes a deleted group with its contents and ends the progress", async () => {
        const store = useTreeStore();
        await store.init();
        await store.open("group-1");
        await store.open("group-2");

        await store.deleteGroup(1);
        await flush();

        expect(store.nodes["group-1"]).toBeUndefined();
        expect(store.nodes["group-2"]).toBeUndefined();
        expect(store.nodes["note-1"]).toBeUndefined();
        expect(store.deletingGroupId).toBeNull();
        expect(keys(ROOT_KEY)).toEqual(["group-4", "group-5", "note-6"]);
    });

    it("loads the tree again after a reset (logout and login)", async () => {
        const store = useTreeStore();
        await store.init();
        store.reset();
        expect(keys(ROOT_KEY)).toEqual([]);

        await store.init();
        expect(keys(ROOT_KEY)).toContain("group-1");

        mockControl.push<CreateGroupResponse>("groups", "createGroupResponse", {
            record: {
                id: 51,
                name: "Once",
                parent_id: null,
                created_at: 0,
                has_subgroups: null,
                has_notes: null,
            },
        });
        await settle();
        await flush();
        expect(keys(ROOT_KEY).filter((key) => key === "group-51")).toHaveLength(
            1,
        );
    });

    it("shows a restored tree and refreshes it in the background", async () => {
        localStorage.setItem(
            "treeStorage",
            JSON.stringify({
                version: 1,
                open: [ROOT_KEY],
                nodes: {
                    [ROOT_KEY]: {
                        key: ROOT_KEY,
                        id: null,
                        type: "root",
                        name: "",
                        is_protected: false,
                        has_children: true,
                        children_loaded: true,
                        parent: null,
                        children: ["group-99"],
                    },
                    "group-99": {
                        key: "group-99",
                        id: 99,
                        type: "group",
                        name: "Stale",
                        is_protected: false,
                        has_children: false,
                        children_loaded: true,
                        parent: ROOT_KEY,
                        children: [],
                    },
                },
            }),
        );

        const store = useTreeStore();
        expect(keys(ROOT_KEY)).toEqual(["group-99"]);

        await store.init();
        await vi.waitFor(() => expect(store.nodes["group-99"]).toBeUndefined());
        expect(keys(ROOT_KEY)).toContain("group-1");
    });
});
