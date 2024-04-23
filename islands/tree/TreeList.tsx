/*
import { Signal, useSignal } from "@preact/signals";
import RootGroupBar from "./RootGroupBar.tsx";
import Loader from "$islands/Loader.tsx";
import { deleteNote, updateGroup, updateNote } from "$frontend/api.ts";
import { useEffect } from "preact/hooks";
import { Icon } from "$components/Icon.tsx";
import TreeItem, {
    ContainerGroupRecord,
    createContainer,
    createNewContainerRecord,
} from "./TreeItem.tsx";
import { validateSchema } from "$schemas/mod.ts";
import { addGroupRequestSchema } from "$schemas/groups.ts";
import { getDisplayMessage } from "$frontend/error-messages.ts";
import { ComponentChild } from "preact";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";
import { getSortedContainerRecords, restoreTreeList } from "./helpers.ts";
import { storeTreeList } from "./helpers.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetTreeMessage,
    GetTreeResponse,
    TreeFrontendResponse,
} from "$workers/websocket/api/tree/messages.ts";
import {
    CreateGroupMessage,
    CreateGroupResponse,
    DeleteGroupMessage,
    GroupFrontendResponse,
    UpdateGroupMessage,
    UpdateGroupResponse,
} from "$workers/websocket/api/group/messages.ts";

interface TreeListProps {
    searchQuery: string;
    switcherComponent: ComponentChild;
}

const restoredTreeList = restoreTreeList();

const findRecordByIdInList = (
    id: number,
    type: ContainerGroupRecord["record"]["type"],
    containers: ContainerGroupRecord[],
): ContainerGroupRecord | null => {
    for (const child of containers) {
        if (child.record.id === id && child.record.type === type) {
            return child;
        }

        const result = findRecordByIdInList(id, type, child.children);

        if (result) {
            return result;
        }
    }

    return null;
};

export default function TreeList({
    switcherComponent,
    searchQuery,
}: TreeListProps) {
    const isReady = useSignal(false);
    const isLoading = useSignal(false);
    const groups: Signal<ContainerGroupRecord[]> = useSignal(restoredTreeList);
    const containerDraggedOver = useSignal<ContainerGroupRecord | null>(null);

    const { sendMessage, dispatchMessage } = useWebsocketService<
        TreeFrontendResponse | GroupFrontendResponse
    >({
        messageNamespace: "tree",
        eventMap: {
            groups: {
                deleteGroupResponse: (data) => {
                    const record = findRecordByIdInList(
                        data.deletedId,
                        "group",
                        groups.value,
                    );

                    if (!record) {
                        return;
                    }

                    const parent = record.parent;

                    if (parent) {
                        parent.children = parent.children.filter((g) =>
                            g !== record
                        );
                        updateToRoot(parent);
                        return;
                    }

                    groups.value = groups.value.filter((g) => g !== record);
                },
                updateGroupResponse: (data) => {
                    const record = findRecordByIdInList(
                        data.updatedId,
                        "group",
                        groups.value,
                    );

                    if (!record) {
                        return;
                    }

                    record.is_processing = false;
                    record.name = data.updatedData?.name ?? record.name;
                    updateToRoot(record);
                },
            },
        },
    });

    const loadGroups = async (parent?: ContainerGroupRecord) => {
        if (!parent) {
            isLoading.value = true;
        } else {
            parent.is_processing = true;
        }

        const response = await sendMessage<GetTreeMessage, GetTreeResponse>({
            request: {
                type: "getTree",
                parent_id: parent?.record.id,
            },
            require: "getTreeResponse",
        });

        const result = response.records.map((record) =>
            createContainer(record, parent ?? null)
        );

        if (!parent) {
            groups.value = result;
        } else {
            parent.children = result;
            parent.are_children_loaded = true;
            updateToRoot(parent);
        }

        if (!parent) {
            isLoading.value = false;
        } else {
            parent.is_processing = false;
        }

        storeTreeList(groups.value);
    };

    const addRootGroup = () => {
        groups.value = [
            ...groups.value,
            createNewContainerRecord(null),
        ];
    };

    const saveGroup = async (container: ContainerGroupRecord) => {
        container.is_processing = true;

        const { is_new_record, name, record } = container;

        if (record.type !== "group") {
            return;
        }

        container.is_processing = true;

        const parentId = container.parent?.record.id ?? null;

        if (is_new_record) {
            const { record } = await sendMessage<
                CreateGroupMessage,
                CreateGroupResponse
            >({
                request: {
                    namespace: "groups",
                    type: "createGroup",
                    data: {
                        name,
                        parent_id: parentId,
                    },
                },
                require: "createGroupResponse",
            });
            container.record.id = record.id;
            container.record.name = record.name;
            container.is_new_record = false;
        } else {
            await dispatchMessage<UpdateGroupMessage>({
                namespace: "groups",
                type: "updateGroup",
                id: record.id,
                data: {
                    name,
                    parent_id: parentId,
                },
            });
        }

        container.edit_mode = false;
        container.is_processing = false;
        updateToRoot(container);
    };

    const updateToRoot = (container: ContainerGroupRecord | null) => {
        let parent: ContainerGroupRecord | null = container;
        while (parent) {
            parent.children = [...parent.children];
            parent = parent.parent;
        }
        groups.value = [...groups.value];
        storeTreeList(groups.value);
    };

    const handleReloadEverything = () => {
        groups.value = [];
        updateToRoot(null);
        loadGroups();
    };

    const handleCancelEdit = (
        container: ContainerGroupRecord,
        parent: ContainerGroupRecord | null,
    ) => {
        if (container.is_new_record) {
            if (parent === null) {
                groups.value = groups.value.filter((g) => g !== container);
            } else {
                parent.children = parent.children.filter((g) =>
                    g !== container
                );
            }
        }

        container.edit_mode = false;

        if (container) {
            updateToRoot(container);
        }
    };

    const handleAcceptEdit = async (
        container: ContainerGroupRecord,
        newName: string,
    ) => {
        container.error_message = "";

        const errors = await validateSchema(addGroupRequestSchema, {
            name: newName,
            parent_id: container.parent ? container.parent.record.id : null,
        });

        if (errors && errors.length > 0) {
            container.error_message = getDisplayMessage(errors);
            updateToRoot(container);
            return;
        }

        container.name = newName;
        await saveGroup(container);
        updateToRoot(container);
    };

    const handleAddGroup = (container: ContainerGroupRecord) => {
        container.children.push(
            createNewContainerRecord(container),
        );
        updateToRoot(container);
    };

    const handleRename = (container: ContainerGroupRecord) => {
        container.edit_mode = true;
        updateToRoot(container);
    };

    const handleAddNote = (container: ContainerGroupRecord) => {
        window.location.href = `/app/note/new?group_id=${container.record.id}`;
    };

    const handleDelete = async (
        container: ContainerGroupRecord,
    ) => {
        container.is_processing = true;

        if (container.record.type === "note") {
            await deleteNote(container.record.id);
        } else {
            dispatchMessage<DeleteGroupMessage>({
                namespace: "groups",
                type: "deleteGroup",
                id: container.record.id,
            });
        }
    };

    const handleSwap = async (
        container: ContainerGroupRecord,
        newParent?: ContainerGroupRecord,
    ) => {
        if (container === null) {
            return;
        }

        container.is_processing = true;
        updateToRoot(container);
        if (newParent) {
            newParent.is_processing = true;
            updateToRoot(newParent);
        }
        if (container.record.type === "note") {
            await updateNote(container.record.id, {
                group_id: newParent ? newParent.record.id : null,
            });
        } else {
            await updateGroup(container.record.id, {
                parent_id: newParent ? newParent.record.id : null,
            });
        }

        container.is_processing = false;

        if (container.parent) {
            container.parent.children = container.parent.children.filter((g) =>
                g !== container
            );

            if (container.parent.children.length === 0) {
                container.parent.are_children_loaded = false;
                container.parent.record.has_children = 0;
                container.parent.is_open = false;
            }

            updateToRoot(container.parent);
        } else {
            groups.value = groups.value.filter((g) => g !== container);
        }

        if (newParent) {
            newParent.is_processing = false;
            newParent.children = getSortedContainerRecords([
                ...newParent.children,
                container,
            ]);
            container.parent = newParent;
        } else {
            container.parent = null;
            groups.value = getSortedContainerRecords([
                ...groups.value,
                container,
            ]);
        }

        updateToRoot(container);
    };

    const handleAddRootNote = () => {
        window.location.href = `/app/note/new`;
    };

    const handleOpen = (container: ContainerGroupRecord) => {
        container.is_open = true;

        if (
            container.record.type === "group" && !container.are_children_loaded
        ) {
            loadGroups(container);
        }

        updateToRoot(container);
    };

    const handleClose = (container: ContainerGroupRecord) => {
        container.is_open = false;
        updateToRoot(container);
    };

    const handleRefresh = (container: ContainerGroupRecord) => {
        container.children = [];
        container.are_children_loaded = false;
        container.is_open = false;
        loadGroups(container);
    };

    useEffect(() => {
        if (restoredTreeList.length === 0) {
            loadGroups();
        }

        closeAllPopovers();
        isReady.value = true;
    }, []);

    return (
        <>
            <RootGroupBar
                switcherComponent={switcherComponent}
                onAddNote={handleAddRootNote}
                onAddRootGroup={addRootGroup}
                onReloadEverything={handleReloadEverything}
                onDropped={() => handleSwap(containerDraggedOver.value!)}
                containerDraggedOver={containerDraggedOver.value}
            />
            <div class="overflow-auto group-list">
                <Loader
                    color="white"
                    visible={isLoading.value}
                    displayType="center-block"
                >
                    Loading notes and groups...
                </Loader>
                {groups.value.map((group) => (
                    <TreeItem
                        container={group}
                        parent={null}
                        onDrop={(toContainer) =>
                            handleSwap(
                                containerDraggedOver.value!,
                                toContainer,
                            )}
                        onAcceptEdit={handleAcceptEdit}
                        onCancelEdit={handleCancelEdit}
                        onAddNote={handleAddNote}
                        onAddGroup={handleAddGroup}
                        onRename={handleRename}
                        onOpen={handleOpen}
                        onClose={handleClose}
                        onRefresh={handleRefresh}
                        onDelete={handleDelete}
                        onDraggingEnd={() => {
                            containerDraggedOver.value = null;
                        }}
                        onDraggingStart={(container) => {
                            containerDraggedOver.value = container;
                        }}
                    />
                ))}
                {isReady.value && groups.value.length === 0 &&
                    !isLoading.value && (
                    <div
                        class="text-center text-gray-400 pt-14 cursor-pointer"
                        onClick={() => {
                            window.location.href = "/app/note/new";
                        }}
                    >
                        <div>
                            <Icon name="note" size="5xl" />
                        </div>
                        Add your first note with <Icon name="plus" />!
                    </div>
                )}
            </div>
        </>
    );
}
*/
