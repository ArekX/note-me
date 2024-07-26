import { ComponentChild } from "preact";
import { RecordTreeHook } from "./hooks/use-record-tree.ts";
import { DragManagerHook } from "$frontend/hooks/use-drag-manager.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import SwitcherContainer from "$islands/sidebar/SwitcherContainer.tsx";

interface RootGroupBarProps {
    treeManager: RecordTreeHook;
    dragManager: DragManagerHook<RecordContainer>;
    switcherComponent: ComponentChild;
}

export default function RootGroupBar({
    treeManager,
    dragManager,
    switcherComponent,
}: RootGroupBarProps) {
    const handleDragOver = (e: DragEvent) => {
        if (dragManager.canDropTo(treeManager.root)) {
            dragManager.setDropTarget(treeManager.root);
            e.preventDefault();
            return;
        }
    };

    const handleDragLeave = () => {
        dragManager.setDropTarget(null);
    };

    const { source, target } = dragManager;

    return (
        <SwitcherContainer
            addClass={target === treeManager.root ? "bg-red-500" : ""}
            switcherComponent={
                <div
                    class={`flex-1`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    {source
                        ? <div class="pl-2">Drop here to move to top level</div>
                        : switcherComponent}
                </div>
            }
            icons={[
                {
                    name: "Add Note",
                    icon: "plus",
                    onClick: () => redirectTo.newNote(),
                },
                {
                    name: "Add Group",
                    icon: "folder-plus",
                    onClick: () =>
                        treeManager.addNew(treeManager.root, {
                            type: "group",
                            display_mode: "edit",
                        }),
                },
                {
                    name: "Reload",
                    icon: "refresh",
                    onClick: () => treeManager.reload(treeManager.root),
                },
            ]}
        />
    );
}
