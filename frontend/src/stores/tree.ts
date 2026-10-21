import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import type {
    CreateGroupMessage,
    UpdateNoteMessage,
    UpdateNoteResponse,
    CreateGroupResponse,
    DeleteGroupMessage,
    DeleteGroupResponse,
    GetTreeMessage,
    GetTreeResponse,
    GroupFrontendResponse,
    NoteFrontendResponse,
    UpdateGroupMessage,
    UpdateGroupResponse,
} from "@/types/messages";
import type { UpdateGroupRequest } from "@/schemas/groups";
import type { UpdateNoteRequest } from "@/schemas/notes";
import { restore, store } from "@/lib/local-storage";
import { socketErrorMessage } from "@/lib/error-messages";
import { useSocketStore } from "./socket";
import { useToastStore } from "./toast";
import {
    ROOT_KEY,
    createRoot,
    createTreeNodes,
    groupKey,
    isUnsaved,
    nodeKey,
    type TreeNode,
} from "./tree-nodes";

export {
    ROOT_KEY,
    nodeFromRecord,
    nodeKey,
    noteNode,
    type TreeNode,
    type TreeNodeType,
} from "./tree-nodes";

interface TreeSnapshot {
    version: 1;
    nodes: Record<string, TreeNode>;
    open: string[];
}

const STORAGE_KEY = "treeStorage";

const restoreSnapshot = (): TreeSnapshot | null => {
    const snapshot = restore<TreeSnapshot>(STORAGE_KEY);
    return snapshot?.version === 1 && snapshot.nodes?.[ROOT_KEY]
        ? snapshot
        : null;
};

export const useTreeStore = defineStore("tree", () => {
    const snapshot = restoreSnapshot();

    const tree = createTreeNodes(
        snapshot?.nodes ?? { [ROOT_KEY]: createRoot() },
        snapshot?.open ?? [ROOT_KEY],
    );
    const {
        nodes,
        openKeys,
        processingKeys,
        editingKeys,
        childrenOf,
        canDropTo,
        removeSubtree,
        groupPath,
    } = tree;
    const isRootLoading = ref(false);
    const deletingGroupId = ref<number | null>(null);
    const deletedCount = ref<number | null>(null);
    const selectedKey = ref<string | null>(null);

    // Where the add buttons above the tree put a new note or group
    // (decision 0.65).
    const targetGroupKey = computed(() => {
        const node = selectedKey.value ? nodes[selectedKey.value] : undefined;
        if (!node) {
            return ROOT_KEY;
        }
        return node.type === "group" ? node.key : (node.parent ?? ROOT_KEY);
    });

    const select = (key: string | null) => {
        selectedKey.value = key;
    };

    let initialized: Promise<void> | null = null;
    let listening: Promise<void> | null = null;

    const isOpen = (key: string) => openKeys.has(key);
    const isProcessing = (key: string) => processingKeys.has(key);
    const isEditing = (key: string) => editingKeys.has(key);

    const getService = () => useSocketStore().getService();

    const { reportError } = useToastStore();

    const whileProcessing = async (key: string, fn: () => Promise<void>) => {
        processingKeys.add(key);
        try {
            await fn();
        } finally {
            processingKeys.delete(key);
        }
    };

    const fetchChildren = async (key: string) => {
        const node = nodes[key];
        if (!node || node.type === "note") {
            return;
        }

        await whileProcessing(key, async () => {
            const service = await getService();
            const { records } = await service.sendMessage<
                GetTreeMessage,
                GetTreeResponse
            >("tree", "getTree", {
                data: { parent_id: node.id ?? undefined },
                expect: "getTreeResponse",
            });
            tree.setChildren(key, records);
        });
    };

    // An update for a node that is not loaded can still change what its new
    // parent shows.
    const refreshParent = (parentId: number | null | undefined) => {
        const parent =
            parentId === undefined ? null : nodes[groupKey(parentId)];
        if (parent?.children_loaded) {
            fetchChildren(parent.key).catch(reportError);
        } else if (parent) {
            parent.has_children = true;
        }
    };

    const loadChildren = async (key: string) => {
        const node = nodes[key];
        if (node && node.has_children && !node.children_loaded) {
            await fetchChildren(key);
        }
    };

    // Reloads a level and every open level below it; closed levels are
    // dropped and load again when opened.
    const refresh = async (key: string): Promise<void> => {
        try {
            await fetchChildren(key);
        } catch (error) {
            reportError(error);
            return;
        }

        const loaded = childrenOf(key).filter(
            (child) => child.has_children && child.children_loaded,
        );
        loaded.filter((child) => !isOpen(child.key)).forEach(tree.unload);
        await Promise.all(
            loaded
                .filter((child) => isOpen(child.key))
                .map((child) => refresh(child.key)),
        );
    };

    const reloadRoot = async () => {
        isRootLoading.value = true;
        try {
            await refresh(ROOT_KEY);
        } finally {
            isRootLoading.value = false;
        }
    };

    const open = async (key: string) => {
        openKeys.add(key);
        try {
            await loadChildren(key);
        } catch (error) {
            openKeys.delete(key);
            reportError(error);
        }
    };

    const close = (key: string) => {
        openKeys.delete(key);
    };

    const toggle = (key: string) => (isOpen(key) ? close(key) : open(key));

    const applyGroupUpdated = (id: number, data: UpdateGroupRequest) => {
        if (!tree.updateGroup(id, data)) {
            refreshParent(data.parent_id);
        }
    };

    const applyGroupDeleted = (id: number) => {
        removeSubtree(nodeKey("group", id));
        if (deletingGroupId.value === id) {
            deletingGroupId.value = null;
            deletedCount.value = null;
        }
    };

    const applyNoteUpdated = (
        id: number,
        data: Pick<UpdateNoteRequest, "title" | "is_encrypted" | "group_id">,
    ) => {
        if (!tree.updateNote(id, data)) {
            refreshParent(data.group_id);
        }
    };

    const requestGroupUpdate = async (id: number, data: UpdateGroupRequest) => {
        const service = await getService();
        const { updated_data } = await service.sendMessage<
            UpdateGroupMessage,
            UpdateGroupResponse
        >("groups", "updateGroup", {
            data: { id, data },
            expect: "updateGroupResponse",
        });
        applyGroupUpdated(id, updated_data);
    };

    const requestNoteUpdate = async (id: number, data: UpdateNoteRequest) => {
        const service = await getService();
        const { updated_data } = await service.sendMessage<
            UpdateNoteMessage,
            UpdateNoteResponse
        >("notes", "updateNote", {
            data: { id, data },
            expect: "updateNoteResponse",
        });
        applyNoteUpdated(id, updated_data);
    };

    const startNewGroup = async (parentKey: string) => {
        await open(parentKey);
        const key = tree.addUnsavedGroup(parentKey);
        if (key) {
            editingKeys.add(key);
        }
    };

    const startEdit = (key: string) => {
        if (nodes[key] && nodes[key].type !== "root") {
            editingKeys.add(key);
        }
    };

    const cancelEdit = (key: string) => {
        if (isUnsaved(key)) {
            removeSubtree(key);
            return;
        }
        editingKeys.delete(key);
    };

    // Throws the server error so the editor can show it.
    const saveName = async (key: string, name: string) => {
        const node = nodes[key];
        if (!node || node.type === "root") {
            return;
        }

        await whileProcessing(key, async () => {
            if (node.type === "note") {
                await requestNoteUpdate(node.id!, { title: name });
                editingKeys.delete(key);
                return;
            }

            if (node.id === null) {
                const parent = node.parent ? nodes[node.parent] : null;
                const service = await getService();
                const { record } = await service.sendMessage<
                    CreateGroupMessage,
                    CreateGroupResponse
                >("groups", "createGroup", {
                    data: { data: { name, parent_id: parent?.id ?? null } },
                    expect: "createGroupResponse",
                });
                removeSubtree(key);
                tree.addGroup(record);
                return;
            }

            await requestGroupUpdate(node.id, { name });
            editingKeys.delete(key);
        });
    };

    const moveItem = async (
        key: string,
        parentId: number | null,
        update: () => Promise<void>,
    ) => {
        const parentKey = groupKey(parentId);
        if (nodes[parentKey]) {
            await open(parentKey);
        }
        await whileProcessing(key, update);
    };

    // Throws the server error so the move dialog can show it.
    const moveGroup = (id: number, parentId: number | null) =>
        moveItem(nodeKey("group", id), parentId, () =>
            requestGroupUpdate(id, { parent_id: parentId }),
        );

    // Throws the server error so the move dialog can show it.
    const moveNote = (id: number, groupId: number | null) =>
        moveItem(nodeKey("note", id), groupId, () =>
            requestNoteUpdate(id, { group_id: groupId }),
        );

    const dropItem = async (sourceKey: string, targetKey: string) => {
        const source = nodes[sourceKey];
        const target = nodes[targetKey];
        if (!source?.id || !target || !canDropTo(sourceKey, targetKey)) {
            return;
        }

        try {
            if (source.type === "note") {
                await moveNote(source.id, target.id);
            } else {
                await moveGroup(source.id, target.id);
            }
        } catch (error) {
            reportError(error);
        }
    };

    const deleteGroup = async (id: number) => {
        deletingGroupId.value = id;
        deletedCount.value = null;
        processingKeys.add(nodeKey("group", id));

        try {
            const service = await getService();
            await service.sendMessage<DeleteGroupMessage, DeleteGroupResponse>(
                "groups",
                "deleteGroup",
                { data: { id }, expect: "deleteGroupResponse" },
            );
            applyGroupDeleted(id);
        } catch (error) {
            // A large group can take longer than the request timeout; the
            // final deleteGroupResponse still closes the progress dialog.
            if (socketErrorMessage(error).startsWith("No response received")) {
                return;
            }
            processingKeys.delete(nodeKey("group", id));
            deletingGroupId.value = null;
            reportError(error);
        }
    };

    const listen = async () => {
        const service = await getService();
        service.listen<GroupFrontendResponse | NoteFrontendResponse>({
            groups: {
                createGroupResponse: ({ record }) => tree.addGroup(record),
                updateGroupResponse: ({ updated_id, updated_data }) =>
                    applyGroupUpdated(updated_id, updated_data),
                deleteGroupResponse: ({ deleted_id }) =>
                    applyGroupDeleted(deleted_id),
                deleteGroupProgress: ({ deleted_id, deleted_count }) => {
                    if (deleted_id === deletingGroupId.value) {
                        deletedCount.value = deleted_count;
                    }
                },
            },
            notes: {
                createNoteResponse: ({ record, group_id }) =>
                    tree.addNote(group_id, record),
                updateNoteResponse: ({ updated_id, updated_data }) =>
                    applyNoteUpdated(updated_id, updated_data),
                revertNoteToHistoryResponse: ({
                    note_id,
                    title,
                    is_encrypted,
                }) => applyNoteUpdated(note_id, { title, is_encrypted }),
                restoreDeletedNoteResponse: ({ restored_note }) => {
                    if (restored_note) {
                        tree.addNote(restored_note.group_id, restored_note);
                    }
                },
                deleteNoteResponse: ({ deleted_id }) =>
                    removeSubtree(nodeKey("note", deleted_id)),
            },
        });
    };

    // A restored tree shows at once and is refreshed in the background, so
    // changes made while the app was closed show up without a manual reload.
    const init = () => {
        initialized ??= (async () => {
            // The socket manager outlives a logout, so listeners stay
            // registered and are added only once.
            listening ??= listen();
            await listening;
            if (nodes[ROOT_KEY]!.children_loaded) {
                void refresh(ROOT_KEY);
            } else {
                await reloadRoot();
            }
        })();
        return initialized;
    };

    const reset = () => {
        tree.clear();
        deletingGroupId.value = null;
        deletedCount.value = null;
        selectedKey.value = null;
        initialized = null;
    };

    watch(
        [nodes, openKeys],
        () =>
            store<TreeSnapshot>(STORAGE_KEY, {
                version: 1,
                ...tree.snapshot(),
            }),
        { deep: true },
    );

    return {
        nodes,
        isRootLoading,
        deletingGroupId,
        deletedCount,
        selectedKey,
        targetGroupKey,
        select,
        groupPath,
        childrenOf,
        isOpen,
        isProcessing,
        isEditing,
        canDropTo,
        init,
        reset,
        refresh,
        reloadRoot,
        open,
        close,
        toggle,
        startNewGroup,
        startEdit,
        cancelEdit,
        saveName,
        moveGroup,
        moveNote,
        dropItem,
        deleteGroup,
    };
});
