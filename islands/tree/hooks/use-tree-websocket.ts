import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { GroupFrontendResponse } from "$workers/websocket/api/groups/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { TreeStateHook } from "$islands/tree/hooks/use-tree-state.ts";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";

interface TreeWebsocketOptions {
    treeState: TreeStateHook;
}

export const useTreeWebsocket = (options: TreeWebsocketOptions) => {
    const {
        tree,
        groupDelete,
        endGroupDelete,
        removeFromParent,
        propagateChanges,
        addChild,
        setContainer,
        changeParent,
        findContainerById,
    } = options.treeState;

    const { sendMessage, dispatchMessage } = useWebsocketService<
        NoteFrontendResponse | GroupFrontendResponse
    >({
        eventMap: {
            notes: {
                createNoteResponse: (data) => {
                    const parent = data.group_id
                        ? findContainerById(data.group_id, "group")
                        : tree;

                    if (!parent) {
                        return;
                    }

                    const newNote = fromTreeRecord({
                        type: "note",
                        id: data.record.id,
                        name: data.record.title,
                        is_encrypted: +data.record.is_encrypted,
                        has_children: 0,
                    });

                    addChild(parent, newNote);
                    propagateChanges();
                },
                deleteNoteResponse: (data) => {
                    const container = findContainerById(
                        data.deleted_id,
                        "note",
                    );
                    if (container) {
                        removeFromParent(container);
                        propagateChanges();
                    }
                },
                revertNoteToHistoryResponse: (data) => {
                    const container = findContainerById(
                        data.note_id,
                        "note",
                    );

                    if (!container) {
                        return;
                    }

                    setContainer(container, {
                        name: data.title,
                    });

                    propagateChanges();
                },
                updateNoteResponse: (data) => {
                    const container = findContainerById(
                        data.updated_id,
                        "note",
                    );

                    if (!container) {
                        return;
                    }

                    if ("title" in data.updated_data) {
                        setContainer(container, {
                            name: data.updated_data.title,
                        });
                    }

                    if (data.updated_data.group_id !== undefined) {
                        changeParent(container, data.updated_data.group_id);
                    }

                    propagateChanges();
                },
            },
            groups: {
                createGroupResponse: (data) => {
                    const parent = data.record.parent_id
                        ? findContainerById(data.record.parent_id, "group")
                        : tree;
                    if (!parent) {
                        return;
                    }

                    const newGroup = fromTreeRecord({
                        type: "group",
                        id: data.record.id,
                        name: data.record.name,
                        is_encrypted: 0,
                        has_children: 0,
                    });

                    addChild(parent, newGroup);
                    propagateChanges();
                },
                deleteGroupResponse: (data) => {
                    const container = findContainerById(
                        data.deleted_id,
                        "group",
                    );
                    if (data.deleted_id === groupDelete?.groupId) {
                        endGroupDelete();
                    }

                    if (container) {
                        removeFromParent(container);
                        propagateChanges();
                    }
                },
                updateGroupResponse: (data) => {
                    const container = findContainerById(
                        data.updated_id,
                        "group",
                    );

                    if (!container) {
                        return;
                    }

                    if (data.updated_data.name) {
                        setContainer(container, {
                            name: data.updated_data.name,
                        });
                    }

                    if (data.updated_data.parent_id !== undefined) {
                        changeParent(container, data.updated_data.parent_id);
                    }

                    propagateChanges();
                },
            },
        },
    });

    return {
        sendMessage,
        dispatchMessage,
    };
};
