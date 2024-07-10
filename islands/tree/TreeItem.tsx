import { RecordTreeHook } from "$islands/tree/hooks/use-record-tree.ts";
import { DragManagerHook } from "$frontend/hooks/use-drag-manager.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Icon from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import MoreMenu, { MoreMenuItemAction } from "$islands/tree/MoreMenu.tsx";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";

export interface TreeItemProps {
    dragManager: DragManagerHook<RecordContainer>;
    treeManager: RecordTreeHook;
    container: RecordContainer;
}

interface TreeItemEditorProps {
    treeManager: RecordTreeHook;
    container: RecordContainer;
}

const TreeItemEditor = (
    { treeManager, container }: TreeItemEditorProps,
) => {
    const name = useSignal(container.name);
    const errorMessages = useSignal("");

    useEffect(() => {
        name.value = container.name;
    }, [container.name]);

    const handleAccept = async (e: Event) => {
        treeManager.setName(container, name.value);
        await treeManager.save(container);
        treeManager.setDisplayMode(container, "view");
        e.stopPropagation();
    };

    const handleCancel = (e: Event) => {
        if (container.id === null) {
            treeManager.deleteContainer(container);
        } else {
            treeManager.setDisplayMode(container, "view");
        }

        e.stopPropagation();
    };

    return (
        <div class="group-item-editor relative flex">
            {!container.is_processing && (
                <div class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
                    <span
                        class="hover:text-white cursor-pointer"
                        title="Accept"
                        onClick={handleAccept}
                    >
                        <Icon name="check" />
                    </span>
                    <span
                        class="hover:text-white cursor-pointer"
                        title="Cancel"
                        onClick={handleCancel}
                    >
                        <Icon name="block" />
                    </span>
                </div>
            )}
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                <Icon name={container.type === "group" ? "folder" : "file"} />
            </div>
            <input
                ref={(el) => el?.focus()}
                type="text"
                class="outline-none border-1 pl-9 pr-14 border-gray-900 bg-gray-700 p-2 w-full"
                placeholder="Enter group name..."
                disabled={container.is_processing}
                value={name.value}
                onKeyDown={(e) => {
                    if (e.key == "Escape") {
                        handleCancel(e);
                    }
                }}
                onKeyPress={(e) => {
                    if (e.key == "Enter") {
                        handleAccept(e);
                    }
                }}
                onInput={(e) =>
                    name.value = (e.target as HTMLInputElement).value}
            />
            {errorMessages.value.length > 0 && (
                <div class="text-red-900 right-0 absolute bottom-10 left-0 z-50 border-1 border-solid bg-red-400">
                    {errorMessages.value}
                </div>
            )}
        </div>
    );
};

export default function TreeItem({
    treeManager,
    dragManager,
    container,
}: TreeItemProps) {
    const confirmDelete = useSignal(false);
    const noteWindowType = useSignal<NoteWindowTypes | null>(null);

    const handleDragStart = (e: DragEvent) => {
        dragManager.drag(container);
        e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent) => {
        dragManager.setDropTarget(null);
        e.stopPropagation();
    };

    const handleDragOver = (e: DragEvent) => {
        e.stopPropagation();
        if (container.type === "group" && dragManager.canDropTo(container)) {
            dragManager.setDropTarget(container);
            e.preventDefault();
            return;
        }
    };

    const handleDragEnd = (e: DragEvent) => {
        e.stopPropagation();

        if (
            dragManager.target &&
            dragManager.canDropTo(dragManager.target)
        ) {
            treeManager.changeParent(
                dragManager.source!,
                dragManager.target,
            );
        }
        dragManager.reset();
    };

    const handleClick = (e: MouseEvent) => {
        e.stopPropagation();
        if (container.type === "note") {
            redirectTo.viewNote({ noteId: +container.id! });
            return;
        }

        if (container.type === "group" && container.has_children) {
            treeManager.toggleOpen(container);
            closeAllPopovers();
        }
    };

    const handleAddNote = (e: MouseEvent) => {
        redirectTo.newNote({
            groupId: container.id || undefined,
        });
        e.stopPropagation();
    };

    const handleEditNote = (e: MouseEvent) => {
        redirectTo.editNote({
            noteId: container.id!,
        });
        e.stopPropagation();
    };

    const handleMoreMenuAction = (action: MoreMenuItemAction) => {
        closeAllPopovers();
        switch (action) {
            case "add-note":
                redirectTo.newNote({
                    groupId: container.id || undefined,
                });
                break;
            case "add-group":
                treeManager.addNew(container, {
                    type: "group",
                    name: "",
                    display_mode: "edit",
                });
                break;
            case "refresh":
                treeManager.reload(container);
                break;
            case "delete":
                if (container.type == "note") {
                    noteWindowType.value = "delete";
                } else {
                    confirmDelete.value = true;
                }
                break;
            case "edit":
                treeManager.setDisplayMode(container, "edit");
                break;
            case "move":
                noteWindowType.value = "move";
                break;
            case "details":
                noteWindowType.value = "details";
                break;
            case "history":
                noteWindowType.value = "history";
                break;
            case "share":
                noteWindowType.value = "share";
                break;
            case "remind-me":
                noteWindowType.value = "remind";
                break;
            case "rename":
                treeManager.setDisplayMode(container, "edit");
                break;
        }
    };

    return (
        <div
            class={`group-item-container select-none ${
                dragManager.target === container ? "bg-red-600" : ""
            }`}
            draggable={noteWindowType.value === null &&
                confirmDelete.value === false}
            onDragStart={handleDragStart}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
        >
            <div
                class={`relative group-item hover:bg-gray-600`}
                title={container.name}
            >
                {container.display_mode !== "edit" &&
                    !container.is_processing && (
                    <div class="absolute right-0 flex items-center group-item-actions pr-1">
                        {container.type === "group" && (
                            <span
                                class="hover:text-gray-300 cursor-pointer"
                                title="Add Note"
                                onClick={handleAddNote}
                            >
                                <Icon name="plus" />
                            </span>
                        )}
                        {container.type === "note" && (
                            <span
                                class="hover:text-gray-300 cursor-pointer"
                                title="Open Note"
                                onClick={handleEditNote}
                            >
                                <Icon name="pencil" />
                            </span>
                        )}
                        <MoreMenu
                            container={container}
                            onAction={handleMoreMenuAction}
                        />
                    </div>
                )}
                {container.is_processing && (
                    <div class="absolute inset-y-0 right-0 flex items-center pl-2 pr-2 text-gray-400">
                        <Icon name="loader-alt" animation="spin" />
                    </div>
                )}
                {container.display_mode == "edit"
                    ? (
                        <TreeItemEditor
                            treeManager={treeManager}
                            container={container}
                        />
                    )
                    : (
                        <span class="group-item-name pl-2 pr-2">
                            <Icon
                                name={container.type == "group"
                                    ? `folder${
                                        container.is_open ? "-open" : ""
                                    }`
                                    : "file"}
                                type={container.type == "group" &&
                                        container.has_children
                                    ? "solid"
                                    : "regular"}
                            />{" "}
                            <span class="name-text">
                                {container.name}
                            </span>
                        </span>
                    )}
            </div>
            {container.is_open && (
                <div class="group-item-children">
                    {container.children.map((child) => (
                        <TreeItem
                            key={child.key}
                            container={child}
                            treeManager={treeManager}
                            dragManager={dragManager}
                        />
                    ))}
                </div>
            )}
            {container.type === "note" && noteWindowType.value && (
                <NoteWindow
                    noteId={+container.id!}
                    type={noteWindowType.value}
                    onClose={() => noteWindowType.value = null}
                />
            )}
            {container.type === "group" && confirmDelete.value && (
                <ConfirmDialog
                    prompt="Are you sure you want to delete this group?"
                    confirmText="Delete group"
                    confirmColor="danger"
                    visible={true}
                    onConfirm={() => {
                        treeManager.deleteContainer(container);
                        confirmDelete.value = false;
                    }}
                    onCancel={() => confirmDelete.value = false}
                />
            )}
        </div>
    );
}
