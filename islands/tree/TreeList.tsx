import { ComponentChild } from "preact";
import { useRecordTree } from "./hooks/use-record-tree.ts";
import RootGroupBar from "$islands/tree/RootGroupBar.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Loader from "$islands/Loader.tsx";
import { useDragManager } from "../../frontend/hooks/use-drag-manager.ts";
import TreeItem from "./TreeItem.tsx";
import Icon from "$components/Icon.tsx";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import { DeleteGroupProgressDialog } from "$islands/tree/DeleteGroupProgressDialog.tsx";

interface TreeListProps {
    searchQuery: string;
    switcherComponent: ComponentChild;
}

export default function TreeList({
    switcherComponent,
}: TreeListProps) {
    const tree = useRecordTree();
    const dragManager = useDragManager<RecordContainer>();

    return (
        <>
            <RootGroupBar
                dragManager={dragManager}
                treeManager={tree}
                switcherComponent={switcherComponent}
            />
            <div class="overflow-auto group-list">
                <Loader
                    color="white"
                    visible={tree.rootLoader.running}
                    displayType="center-block"
                >
                    Loading notes and groups...
                </Loader>
                {!tree.rootLoader.running &&
                    tree.root.children_loaded &&
                    tree.root.children.length === 0 &&
                    (
                        <div
                            class="text-center text-gray-400 pt-14 cursor-pointer"
                            onClick={() => redirectTo.newNote()}
                        >
                            <div>
                                <Icon name="note" size="5xl" />
                            </div>
                            Add your first note with <Icon name="plus" />!
                        </div>
                    )}
                {!tree.rootLoader.running &&
                    tree.root.children.map((container) => (
                        <TreeItem
                            key={container.key}
                            container={container}
                            dragManager={dragManager}
                            treeManager={tree}
                        />
                    ))}
                {tree.groupDelete &&
                    <DeleteGroupProgressDialog />}
            </div>
        </>
    );
}
