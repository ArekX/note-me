import {
    RecordContainer,
    RecordTreeHook,
} from "$islands/tree/hooks/use-record-tree.ts";
import { DragManagerHook } from "$islands/tree/hooks/use-drag-manager.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";

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
            {container.type !== "root" && container.name}
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
