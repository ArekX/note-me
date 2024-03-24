import { Signal, useSignal } from "@preact/signals";
import SearchBar from "./SearchBar.tsx";
import RootGroupBar from "./RootGroupBar.tsx";
import Loader from "$islands/Loader.tsx";
import { createGroup, findGroups, updateGroup } from "$frontend/api.ts";
import { useEffect } from "preact/hooks";
import { FindGroupsRequest } from "../../backend/api-handlers/groups/find-groups.ts";
import { Icon } from "$components/Icon.tsx";
import GroupItem, {
    ContainerGroupRecord,
    createContainer,
    createNewContainerRecord,
} from "$islands/groups/GroupItem.tsx";
import { clearPopupOwner } from "$frontend/stores/active-sidebar-item.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { deleteGroup } from "$frontend/api.ts";
import { validateSchema } from "$schemas/mod.ts";
import { addGroupRequestSchema } from "$schemas/groups.ts";
import { getDisplayMessage } from "$frontend/error-messages.ts";

export default function GroupList() {
    const isLoading = useSignal(true);
    const groups: Signal<ContainerGroupRecord[]> = useSignal([]);
    const containerDraggedOver = useSignal<ContainerGroupRecord | null>(null);

    const searchNotesAndGroups = async (query: string) => {
    };

    const loadGroups = async (parent?: ContainerGroupRecord) => {
        if (!parent) {
            isLoading.value = true;
        } else {
            parent.is_processing = true;
        }

        const request: FindGroupsRequest = {};

        if (parent) {
            request.parent_id = parent.record.id.toString();
        }

        const result = (await findGroups(request)).data.map((
            record: GroupRecord,
        ) => createContainer({
            type: "group",
            record,
        }, parent ?? null));

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
            createNewContainerRecord("group", null, null),
        ];
    };

    const saveGroup = async (container: ContainerGroupRecord) => {
        container.is_processing = true;

        const { is_new_record, name, type, record } = container;

        if (type !== "group") {
            return;
        }

        container.is_processing = true;

        if (is_new_record) {
            container.record = (await createGroup({
                name,
                parent_id: record.parent_id,
            })).data;
            container.is_new_record = false;
        } else {
            await updateGroup(
                record.id,
                {
                    name,
                    parent_id: container.record.parent_id,
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
            createNewContainerRecord("group", container.record.id, container),
        );
        updateToRoot(container);
    };

    const handleRename = (container: ContainerGroupRecord) => {
        container.edit_mode = true;
        updateToRoot(container);
    };

    const handleLoadchildren = (container: ContainerGroupRecord) => {
        loadGroups(container);
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

            if (container.type === "group") {
                container.record.parent_id = newParent.record.id;
            }
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
        clearPopupOwner();
    }, []);

    return (
        <div class="mt-3">
            <SearchBar onSearch={searchNotesAndGroups} />
            <RootGroupBar
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
                    <GroupItem
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
        </div>
    );
}
