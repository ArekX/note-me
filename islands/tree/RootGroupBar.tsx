import { Icon } from "$components/Icon.tsx";
import { ComponentChild } from "preact";
import { RecordTreeHook } from "./hooks/use-record-tree.ts";
import { DragManagerHook } from "../../frontend/hooks/use-drag-manager.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";

interface RootGroupBarProps {
    treeManager: RecordTreeHook;
    dragManager: DragManagerHook<RecordContainer>;
    switcherComponent: ComponentChild;
}

const RootGroupBar = ({
    treeManager,
    dragManager,
    switcherComponent,
}: RootGroupBarProps) => {
    const handleDrop = (e: DragEvent) => {
        treeManager.changeParent(dragManager.source!, treeManager.root);
    };

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
        <div
            class={`flex pl-2 select-none  ${
                target === treeManager.root ? "bg-red-500" : ""
            }`}
        >
            <div
                class={`flex-1 pt-1 text-sm`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {source
                    ? <div>Drop here to move to top level</div>
                    : switcherComponent}
            </div>
            <div class="flex-1 text-right opacity-30 hover:opacity-100 pr-1">
                <span
                    class="cursor-pointer hover:text-gray-300"
                    title="Add Note"
                    onClick={() => redirectTo.newNote()}
                >
                    <Icon name="plus" />
                </span>
                <span
                    class="cursor-pointer hover:text-gray-300"
                    title="Add Group"
                    onClick={() =>
                        treeManager.addNew(treeManager.root, {
                            type: "group",
                            display_mode: "edit",
                        })}
                >
                    <Icon name="folder-plus" />
                </span>
                <span
                    class="cursor-pointer hover:text-gray-300"
                    title="Reload"
                    onClick={() => treeManager.reload(treeManager.root)}
                >
                    <Icon name="refresh" />
                </span>
            </div>
        </div>
    );
};

export default RootGroupBar;
