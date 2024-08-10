import { useEffect } from "preact/hooks";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import { RecordTreeHook } from "$islands/tree/hooks/use-record-tree.ts";
import { useSignal } from "@preact/signals";
import Icon from "$components/Icon.tsx";

interface TreeItemEditorProps {
    treeManager: RecordTreeHook;
    container: RecordContainer;
}

export default function TreeItemEditor(
    { treeManager, container }: TreeItemEditorProps,
) {
    const name = useSignal(container.name);
    const errorMessages = useSignal("");

    useEffect(() => {
        name.value = container.name;
    }, [container.name]);

    const handleAccept = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        treeManager.setName(container, name.value);
        await treeManager.save(container);
        treeManager.setDisplayMode(container, "view");
    };

    const handleCancel = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (container.id === null) {
            treeManager.deleteContainer(container);
        } else {
            treeManager.setDisplayMode(container, "view");
        }
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
                <div class="text-red-900 right-0 absolute bottom-10 left-0 z-40 border-1 border-solid bg-red-400">
                    {errorMessages.value}
                </div>
            )}
        </div>
    );
}
