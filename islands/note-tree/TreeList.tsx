import { Signal, useSignal } from "@preact/signals";
import RootGroupBar from "./RootGroupBar.tsx";
import Loader from "$islands/Loader.tsx";
import { createGroup, updateGroup } from "$frontend/api.ts";
import { useEffect } from "preact/hooks";
import { GetTreeRequest } from "$backend/api-handlers/tree/get-tree-records.ts";
import { Icon } from "$components/Icon.tsx";
import TreeItem, {
    ContainerGroupRecord,
    createContainer,
    createNewContainerRecord,
} from "./TreeItem.tsx";
import { deleteGroup } from "$frontend/api.ts";
import { validateSchema } from "$schemas/mod.ts";
import { addGroupRequestSchema } from "$schemas/groups.ts";
import { getDisplayMessage } from "$frontend/error-messages.ts";
import { ComponentChild } from "preact";
import { getTreeList } from "$frontend/api.ts";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";

interface GroupListProps {
    searchQuery: string;
    switcherComponent: ComponentChild;
}

export default function TreeList({
    switcherComponent,
    searchQuery,
}: GroupListProps) {
    const isLoading = useSignal(true);
    const groups: Signal<ContainerGroupRecord[]> = useSignal([]);
    const containerDraggedOver = useSignal<ContainerGroupRecord | null>(null);

    const loadGroups = async (parent?: ContainerGroupRecord) => {
        if (!parent) {
            isLoading.value = true;
        } else {
            parent.is_processing = true;
        }

        const request: GetTreeRequest = {};

        if (parent) {
            request.parent_id = parent.record.id;
        }

        const result = (await getTreeList(request)).data.map((
            record: TreeRecord,
        ) => createContainer(record, parent ?? null));

        if (!parent) {
            groups.value = result;
        } else {
            parent.children = result;
            updateToRoot(parent);
        }

        if (!parent) {
            isLoading.value = false;
        } else {
            parent.is_processing = false;
        }
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
            const { data } = await createGroup({
                name,
                parent_id: parentId,
            });
            container.record.id = data.id;
            container.record.name = data.name;
            container.is_new_record = false;
        } else {
            await updateGroup(
                record.id,
                {
                    name,
                    parent_id: parentId,
                },
            );
            container.record.name = container.name;
        }

        container.edit_mode = false;
        container.is_processing = false;
        updateToRoot(container);
    };

    const updateToRoot = (container: ContainerGroupRecord) => {
        container.children = [...container.children];
        let parent = container.parent;
        while (parent) {
            parent.children = [...parent.children];
            parent = parent.parent;
        }
        groups.value = [...groups.value];
    };

    const handleReloadEverything = () => {
        groups.value = [];
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

    const handleLoadchildren = (container: ContainerGroupRecord) => {
        loadGroups(container);
        closeAllPopovers();
    };

    const handleAddNote = (container: ContainerGroupRecord) => {
        window.location.href = `/app/note/new?group_id=${container.record.id}`;
    };

    const handleDelete = async (
        container: ContainerGroupRecord,
        parent?: ContainerGroupRecord,
    ) => {
        container.is_processing = true;
        await deleteGroup(container.record.id);

        if (parent) {
            parent.children = parent.children.filter((g) => g !== container);
            updateToRoot(parent);
            return;
        }

        groups.value = groups.value.filter((g) => g !== container);
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

        await updateGroup(container.record.id, {
            parent_id: newParent ? newParent.record.id : null,
        });

        container.is_processing = false;

        if (container.parent) {
            container.parent.children = container.parent.children.filter((g) =>
                g !== container
            );
            updateToRoot(container.parent);
        } else {
            groups.value = groups.value.filter((g) => g !== container);
        }

        if (newParent) {
            newParent.is_processing = false;
            newParent.children = [...newParent.children, container].toSorted((
                a,
                b,
            ) => a.record.id - b.record.id);
            container.parent = newParent;
        } else {
            container.parent = null;
            groups.value = [...groups.value, container].toSorted((a, b) =>
                a.record.id - b.record.id
            );
        }

        updateToRoot(container);
    };

    const handleAddRootNote = () => {
        window.location.href = `/app/note/new`;
    };

    useEffect(() => {
        loadGroups();
        closeAllPopovers();
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
                        onLoadChildren={handleLoadchildren}
                        onDelete={handleDelete}
                        onDraggingEnd={() => {
                            containerDraggedOver.value = null;
                        }}
                        onDraggingStart={(container) => {
                            containerDraggedOver.value = container;
                        }}
                    />
                ))}
                {groups.value.length === 0 && !isLoading.value && (
                    <div
                        class="text-center text-gray-400 pt-14 cursor-pointer"
                        onClick={() => {
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
