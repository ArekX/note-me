import { RecordTreeHook } from "$islands/tree/hooks/use-record-tree.ts";
import { DragManagerHook } from "$frontend/hooks/use-drag-manager.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Icon from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import MoreMenu, { MoreMenuItemAction } from "$islands/tree/MoreMenu.tsx";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";
import { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";
import { useSearch } from "$frontend/hooks/use-search.ts";
import TreeWindow, { TreeWindowAction } from "$islands/tree/TreeWindow.tsx";
import TreeItemEditor from "$islands/tree/TreeItemEditor.tsx";

export interface TreeItemProps {
    dragManager: DragManagerHook<RecordContainer>;
    treeManager: RecordTreeHook;
    container: RecordContainer;
}

export default function TreeItem({
    treeManager,
    dragManager,
    container,
}: TreeItemProps) {
    const search = useSearch();
    const treeWindowType = useSignal<NoteWindowTypes | null>(null);

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
                treeWindowType.value = "delete";
                break;
            case "edit":
                treeManager.setDisplayMode(container, "edit");
                break;
            case "move":
                treeWindowType.value = "move";
                break;
            case "details":
                treeWindowType.value = "details";
                break;
            case "history":
                treeWindowType.value = "history";
                break;
            case "share":
                treeWindowType.value = "share";
                break;
            case "remind-me":
                treeWindowType.value = "remind";
                break;
            case "rename":
                treeManager.setDisplayMode(container, "edit");
                break;
            case "search-group":
                if (container.type === "group") {
                    search.setGroup({
                        id: container.id!,
                        name: container.name,
                        has_children: Number(container.has_children),
                        is_encrypted: 0,
                        type: "group",
                    });
                }
                break;
        }
    };

    const handleWindowAction = (action: TreeWindowAction) => {
        if (action === "closed") {
            treeWindowType.value = null;
        } else if (action === "confirmed-delete") {
            treeManager.deleteContainer(container);
            treeWindowType.value = null;
        }
    };

    return (
        <div
            class={`group-item-container select-none ${
                dragManager.target === container ? "bg-red-600" : ""
            }`}
            draggable={treeWindowType.value === null}
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
                            <div class="relative inline-block">
                                {container.is_protected && (
                                    <div class="absolute -bottom-1 right-0">
                                        <Icon
                                            name="lock-alt"
                                            type="solid"
                                            size="sm"
                                        />
                                    </div>
                                )}
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
                                />
                            </div>{" "}
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
            {treeWindowType.value && (
                <TreeWindow
                    windowType={treeWindowType.value}
                    container={container}
                    onAction={handleWindowAction}
                />
            )}
        </div>
    );
}
