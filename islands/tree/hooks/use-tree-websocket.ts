import { NoteFrontendResponse } from "$workers/websocket/api/notes/messages.ts";
import { GroupFrontendResponse } from "$workers/websocket/api/group/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { TreeStateHook } from "$islands/tree/hooks/use-tree-state.ts";

interface TreeWebsocketOptions {
    treeState: TreeStateHook;
}

export const useTreeWebsocket = (options: TreeWebsocketOptions) => {
    const {
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
                        setContainer(container, {
                            name: data.updatedData.title,
                        });
                        propagateChanges();
                    }
                },
            },
            groups: {
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
