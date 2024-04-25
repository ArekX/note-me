import { Icon } from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import { ComponentChild } from "preact";
import { RecordContainer } from "./hooks/use-record-tree.ts";

interface RootGroupBarProps {
    containerDraggedOver: RecordContainer | null;
    onDropped: (e: DragEvent) => void;
    onAddRootGroup: () => void;
    onReloadEverything: () => void;
    onAddNote: () => void;
    switcherComponent: ComponentChild;
}

const RootGroupBar = ({
    containerDraggedOver,
    switcherComponent,
    onDropped,
    onAddRootGroup,
    onReloadEverything,
    onAddNote,
}: RootGroupBarProps) => {
    const rootDraggedOver = useSignal(false);

    const handleDrop = (e: DragEvent) => {
        rootDraggedOver.value = false;
        onDropped(e);
    };

    const handleDragOver = (e: DragEvent) => {
        if (containerDraggedOver?.parent === null) {
            return;
        }
        rootDraggedOver.value = true;
        e.preventDefault();
    };

    const handleDragLeave = () => {
        rootDraggedOver.value = false;
    };

    return (
        <div
            class={`flex pl-2 select-none  ${
                rootDraggedOver.value ? "bg-red-500" : ""
            }`}
        >
            <div
                class={`flex-1 pt-1 text-sm`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {containerDraggedOver
                    ? <div>Drop here to move to top level</div>
                    : switcherComponent}
            </div>
            <div class="flex-1 text-right opacity-30 hover:opacity-100 pr-1">
                <span
                    class="cursor-pointer hover:text-gray-300"
                    title="Add Note"
                    onClick={onAddNote}
                >
                    <Icon name="plus" />
                </span>
                <span
                    class="cursor-pointer hover:text-gray-300"
                    title="Add Group"
                    onClick={onAddRootGroup}
                >
                    <Icon name="folder-plus" />
                </span>
                <span
                    class="cursor-pointer hover:text-gray-300"
                    title="Reload"
                    onClick={onReloadEverything}
                >
                    <Icon name="refresh" />
                </span>
            </div>
        </div>
    );
};

export default RootGroupBar;
