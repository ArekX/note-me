import {
    RecordContainer,
    RecordTreeHook,
} from "$islands/tree/hooks/use-record-tree.ts";
import { DragManagerHook } from "$islands/tree/hooks/use-drag-manager.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { Icon } from "$components/Icon.tsx";

export interface TreeItemProps {
    drag_manager: DragManagerHook<RecordContainer>;
    tree_manager: RecordTreeHook;
    container: RecordContainer;
}

export default function TreeItem({
    tree_manager,
    drag_manager,
    container,
}: TreeItemProps) {
    return (
        <div
            class={`group-item-container select-none ${
                drag_manager.target === container ? "bg-red-600" : ""
            }`}
            onClick={(e) => {
                if (container.type === "note") {
                    redirectTo.viewNote({ noteId: +container.id! });
                    return;
                }
                e.stopPropagation();
            }}
        >
            <div
                class={`relative group-item hover:bg-gray-600`}
                title={container.name}
            >
                <div class="absolute right-0 flex items-center group-item-actions pr-1">
                    {container.type === "group" && (
                        <span
                            class="hover:text-gray-300 cursor-pointer"
                            title="Add Note"
                            onClick={(e) => {
                                redirectTo.newNote({
                                    groupId: container.id || undefined,
                                });
                                e.stopPropagation();
                            }}
                        >
                            <Icon name="plus" />
                        </span>
                    )}
                    {container.type === "note" && (
                        <span
                            class="hover:text-gray-300 cursor-pointer"
                            title="Open Note"
                            onClick={(e) => {
                                redirectTo.editNote({
                                    noteId: container.id!,
                                });
                                e.stopPropagation();
                            }}
                        >
                            <Icon name="pencil" />
                        </span>
                    )}
                    {
                        /* <MoreMenu
                            record={container.record}
                            onAction={handleIconMenuAction}
                        /> */
                    }
                </div>
                {container.is_processing && (
                    <div class="absolute inset-y-0 right-0 flex items-center pl-2 pr-2 text-gray-400">
                        <Icon name="loader-alt" animation="spin" />
                    </div>
                )}

                <span class="group-item-name pl-2 pr-2">
                    <Icon
                        name={container.type == "group"
                            ? (container.is_open ? "folder-open" : "folder")
                            : "file"}
                        type={container.type == "group" &&
                                container.has_children
                            ? "solid"
                            : "regular"}
                    />{" "}
                    <span class="name-text">{container.name}</span>
                </span>
            </div>
            {container.is_open && (
                <div class="group-item-children">
                    {container.children.map((child) => (
                        <TreeItem
                            container={child}
                            tree_manager={tree_manager}
                            drag_manager={drag_manager}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
