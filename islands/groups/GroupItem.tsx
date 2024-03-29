import { Icon } from "$components/Icon.tsx";
import { Signal, signal, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { MoreMenuItemAction } from "$islands/groups/MoreMenu.tsx";
import { MoreMenu } from "./MoreMenu.tsx";
import { isPopoverOpen } from "$frontend/hooks/use-single-popover.ts";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";

export interface ContainerGroupRecord {
    is_new_record: boolean;
    is_processing: boolean;
    edit_mode: boolean;
    error_message: string;
    name: string;
    record: TreeRecord;
    parent: ContainerGroupRecord | null;
    children: ContainerGroupRecord[];
}

interface GroupItemProps {
    parent: ContainerGroupRecord | null;
    container: ContainerGroupRecord;
    onAcceptEdit: (container: ContainerGroupRecord, newName: string) => void;
    onCancelEdit: (
        container: ContainerGroupRecord,
        parent: ContainerGroupRecord | null,
    ) => void;
    onAddNote: (
        container: ContainerGroupRecord,
        parent: ContainerGroupRecord | null,
    ) => void;
    onAddGroup: (
        container: ContainerGroupRecord,
        parent: ContainerGroupRecord | null,
    ) => void;
    onRename: (container: ContainerGroupRecord) => void;
    onDelete: (container: ContainerGroupRecord) => void;
    onDrop: (toContainer: ContainerGroupRecord) => void;
    onDraggingStart: (container: ContainerGroupRecord) => void;
    onDraggingEnd: (container: ContainerGroupRecord) => void;
    onLoadChildren: (container: ContainerGroupRecord) => void;
}

export const createNewContainerRecord = (
    parent: ContainerGroupRecord | null,
): ContainerGroupRecord => {
    return {
        ...createContainer(
            {
                id: 0,
                type: "group",
                name: "",
                has_children: 0,
            },
            parent,
        ),
        is_new_record: true,
        edit_mode: true,
    };
};

export const createContainer = (
    record: TreeRecord,
    parent: ContainerGroupRecord | null,
): ContainerGroupRecord => {
    return {
        is_new_record: false,
        is_processing: false,
        edit_mode: false,
        error_message: "",
        name: record.name,
        record,
        parent,
        children: [],
    };
};

const draggedContainer: Signal<ContainerGroupRecord | null> = signal(null);
const selectedTo: Signal<ContainerGroupRecord | null> = signal(null);

export default function GroupItem({
    parent,
    container,
    onAcceptEdit,
    onAddNote,
    onAddGroup,
    onCancelEdit,
    onRename,
    onDelete,
    onLoadChildren,
    onDraggingStart,
    onDraggingEnd,
    onDrop,
}: GroupItemProps) {
    const name = useSignal(container.name);
    const isOpen = useSignal(false);
    const isConfirmingDelete = useSignal(false);
    const areChildrenLoaded = useSignal(false);

    const handleCancel = () => {
        const newRecordCount =
            container.children.filter((c) => c.is_new_record).length;

        if (newRecordCount === container.children.length) {
            isOpen.value = false;
        }

        name.value = container.name;
        onCancelEdit(container, parent);
    };

    const handleOpenFolder = () => {
        const { edit_mode, record, children } = container;

        if (edit_mode || (!record.has_children && children.length == 0)) {
            return;
        }

        isOpen.value = !isOpen.value;

        if (isOpen.value && !areChildrenLoaded.value) {
            onLoadChildren(container);
        }
    };

    const handleDragOver = (e: DragEvent) => {
        if (
            draggedContainer.value === container ||
            draggedContainer.value?.parent === container ||
            draggedContainer.value?.children.includes(container)
        ) {
            selectedTo.value = null;
            e.stopPropagation();
            return;
        }

        selectedTo.value = container;
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = () => {
        if (!selectedTo.value || !draggedContainer.value) {
            return;
        }

        onDrop(selectedTo.value);
        draggedContainer.value = null;
        selectedTo.value = null;
    };

    const handleDragStart = (e: DragEvent) => {
        draggedContainer.value = container;
        onDraggingStart(container);
        e.stopPropagation();
    };

    const handleDragEnd = () => {
        onDraggingEnd(draggedContainer.value!);
        draggedContainer.value = null;
        selectedTo.value = null;
    };

    const handleIconMenuAction = (action: MoreMenuItemAction) => {
        switch (action) {
            case "add-note":
                isOpen.value = true;
                onAddNote(container, parent);
                break;
            case "add-group":
                isOpen.value = true;
                onAddGroup(container, parent);
                break;
            case "refresh":
                container.children = [];
                areChildrenLoaded.value = false;
                onLoadChildren(container);
                break;
            case "rename":
                onRename(container);
                break;
            case "delete":
                isConfirmingDelete.value = true;
                break;
        }
    };

    useEffect(() => {
        name.value = container.name;
    }, [container.name]);

    useEffect(() => {
        if (container.children.length == 0) {
            isOpen.value = false;
            areChildrenLoaded.value = false;
        }
    }, [container.children]);

    return (
        <div
            class={`group-item-container select-none ${
                selectedTo.value === container ? "bg-red-600" : ""
            }`}
            onClick={(e) => {
                closeAllPopovers();
                handleOpenFolder();
                e.stopPropagation();
            }}
        >
            <div
                draggable={true}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => selectedTo.value = null}
                onDragEnd={handleDragEnd}
                class={`relative group-item hover:bg-gray-600 ${
                    isPopoverOpen(
                            `${container.record.type}-${container.record.id}`,
                        )
                        ? "opened-menu"
                        : ""
                }`}
                title={container.name}
            >
                {!container.edit_mode && !container.is_processing && (
                    <div class="absolute right-0 flex items-center group-item-actions pr-1">
                        {container.record.type === "group" && (
                            <span
                                class="hover:text-gray-300 cursor-pointer"
                                title="Add Note"
                                onClick={(e) => {
                                    onAddNote(container, parent);
                                    closeAllPopovers();
                                    e.stopPropagation();
                                }}
                            >
                                <Icon name="plus" />
                            </span>
                        )}
                        <MoreMenu
                            record={container.record}
                            onAction={handleIconMenuAction}
                        />
                    </div>
                )}
                {container.is_processing && (
                    <div class="absolute inset-y-0 right-0 flex items-center pl-2 pr-2 text-gray-400">
                        <Icon name="loader-alt" animation="spin" />
                    </div>
                )}

                {container.edit_mode
                    ? (
                        <div class="group-item-editor relative flex">
                            {!container.is_processing && (
                                <div class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
                                    <span
                                        class="hover:text-white cursor-pointer"
                                        title="Accept"
                                        onClick={(e) => {
                                            onAcceptEdit(container, name.value);
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Icon name="check" />
                                    </span>
                                    <span
                                        class="hover:text-white cursor-pointer"
                                        title="Cancel"
                                        onClick={(e) => {
                                            handleCancel();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Icon name="block" />
                                    </span>
                                </div>
                            )}
                            <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                                <Icon name="folder" />
                            </div>
                            <input
                                type="text"
                                class="outline-none border-1 pl-9 pr-14 border-gray-900 bg-gray-700 p-2 w-full"
                                placeholder="Enter group name..."
                                autoFocus={true}
                                disabled={container.is_processing}
                                value={name.value}
                                onKeyPress={(e) => {
                                    if (e.key == "Enter") {
                                        onAcceptEdit(container, name.value);
                                    }
                                }}
                                onInput={(e) =>
                                    name.value =
                                        (e.target as HTMLInputElement).value}
                            />
                            {container.error_message.length > 0 && (
                                <div class="text-red-900 right-0 absolute bottom-10 left-0 z-50 border-1 border-solid bg-red-400">
                                    {container.error_message}
                                </div>
                            )}
                        </div>
                    )
                    : (
                        <span class="group-item-name pl-2 pr-2">
                            <Icon
                                name={container.record.type == "group"
                                    ? (isOpen.value ? "folder-open" : "folder")
                                    : "file"}
                                type={container.record.type == "group" &&
                                        (container.record.has_children ||
                                            container.children.length > 0)
                                    ? "solid"
                                    : "regular"}
                            />{" "}
                            <span class="name-text">{container.name}</span>
                        </span>
                    )}
            </div>
            {isOpen.value && (
                <div class="group-item-children">
                    {container.children.map((child) => (
                        <GroupItem
                            container={child}
                            parent={container}
                            onAcceptEdit={onAcceptEdit}
                            onCancelEdit={onCancelEdit}
                            onAddNote={onAddNote}
                            onAddGroup={onAddGroup}
                            onRename={onRename}
                            onDelete={onDelete}
                            onLoadChildren={onLoadChildren}
                            onDraggingStart={onDraggingStart}
                            onDraggingEnd={onDraggingEnd}
                            onDrop={onDrop}
                        />
                    ))}
                </div>
            )}
            <ConfirmDialog
                prompt={`Are you sure that you want to delete this ${container.record.type}?`}
                onConfirm={() => {
                    isConfirmingDelete.value = false;
                    onDelete(container);
                }}
                confirmColor="danger"
                confirmText={`Delete ${container.record.type}`}
                onCancel={() => {
                    isConfirmingDelete.value = false;
                }}
                visible={isConfirmingDelete.value}
            />
        </div>
    );
}
