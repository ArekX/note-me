import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { GroupFrontendResponse } from "../../../workers/websocket/api/groups/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { TreeStateHook } from "$islands/tree/hooks/use-tree-state.ts";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";

interface TreeWebsocketOptions {
    treeState: TreeStateHook;
}

export const useTreeWebsocket = (options: TreeWebsocketOptions) => {
    const {
        tree,
        removeFromParent,
        propagateChanges,
        addChild,
        setContainer,
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
                    if (parent) {
                        const newNote = fromTreeRecord({
                            type: "note",
                            id: data.record.id,
                            name: data.record.title,
                            has_children: 0,
                        });

                        addChild(parent, newNote);
                        propagateChanges();
                    }
                },
                deleteNoteResponse: (data) => {
                    const container = findContainerById(data.deletedId, "note");
                    if (container) {
                        removeFromParent(container);
                        propagateChanges();
                    }
                },
                updateNoteResponse: (data) => {
                    const container = findContainerById(data.updatedId, "note");
                    if (container) {
                        if ("title" in data.updatedData) {
                            setContainer(container, {
                                name: data.updatedData.title,
                            });
                        }

                        propagateChanges();
                    }
                },
            },
            groups: {
                createGroupResponse: (data) => {
                    const parent = data.record.parent_id
                        ? findContainerById(data.record.parent_id, "group")
                        : tree;
                    if (parent) {
                        const newGroup = fromTreeRecord({
                            type: "group",
                            id: data.record.id,
                            name: data.record.name,
                            has_children: 0,
                        });

                        addChild(parent, newGroup);
                        propagateChanges();
                    }
                },
                deleteGroupResponse: (data) => {
                    const container = findContainerById(
                        data.deletedId,
                        "group",
                    );
                    if (container) {
                        removeFromParent(container);
                        propagateChanges();
                    }
                },
                updateGroupResponse: (data) => {
                    const container = findContainerById(
                        data.updatedId,
                        "group",
                    );
                    if (container) {
                        if (data.updatedData.name) {
                            setContainer(container, {
                                name: data.updatedData.name,
                            });
                        }

                        if (data.updatedData.parent_id) {
                            const parent = findContainerById(
                                data.updatedData.parent_id,
                                "group",
                            );
                            if (parent) {
                                removeFromParent(container);
                                addChild(parent, container);
                            }
                        }

                        propagateChanges();
                    }
                },
            },
        },
    });

    return {
        sendMessage,
        dispatchMessage,
    };
};
