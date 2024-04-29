import { Icon } from "$components/Icon.tsx";
import { ComponentChild } from "preact";
import { RecordContainer, RecordTreeHook } from "./hooks/use-record-tree.ts";
import { DragManagerHook } from "$islands/tree/hooks/use-drag-manager.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";

interface RootGroupBarProps {
    recordTree: RecordTreeHook;
    dragManager: DragManagerHook<RecordContainer>;
    switcherComponent: ComponentChild;
}

const RootGroupBar = ({
    recordTree,
    dragManager,
    switcherComponent,
}: RootGroupBarProps) => {
    const handleDrop = (e: DragEvent) => {
        recordTree.changeParent(dragManager.source!, recordTree.root);
    };

    const handleDragOver = (e: DragEvent) => {
        if (dragManager.canDropTo(recordTree.root)) {
            dragManager.setDropTarget(recordTree.root);
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
                target === recordTree.root ? "bg-red-500" : ""
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
                        recordTree.addNew(recordTree.root, {
                            type: "group",
                            display_mode: "edit",
                        })}
                >
                    <Icon name="folder-plus" />
                </span>
                <span
                    class="cursor-pointer hover:text-gray-300"
                    title="Reload"
                    onClick={() => recordTree.reloadTree()}
                >
                    <Icon name="refresh" />
                </span>
            </div>
        </div>
    );
};

export default RootGroupBar;
