import { ComponentChild } from "preact";
import { RecordContainer, useRecordTree } from "./hooks/use-record-tree.ts";
import RootGroupBar from "$islands/tree/RootGroupBar.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { useSignal } from "@preact/signals";
import Loader from "$islands/Loader.tsx";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import { useDragManager } from "$islands/tree/hooks/use-drag-manager.ts";
import NewTreeItem from "$islands/tree/NewTreeItem.tsx";

interface TreeListProps {
    searchQuery: string;
    switcherComponent: ComponentChild;
}

export const NewTreeList = ({
    switcherComponent,
    searchQuery,
}: TreeListProps) => {
    const tree = useRecordTree();
    const dragManager = useDragManager<RecordContainer>();

    return (
        <>
            <RootGroupBar
                switcherComponent={switcherComponent}
                onAddNote={() => redirectTo.newNote()}
                onAddRootGroup={() => tree.addNew(tree.root, "group")}
                onReloadEverything={() => tree.reloadTree()}
                onDropped={() =>
                    tree.swapParent(dragManager.source!, tree.root)}
                containerDraggedOver={dragManager.source}
            />
            <div class="overflow-auto group-list">
                <Loader
                    color="white"
                    visible={tree.root_loader.running}
                    displayType="center-block"
                >
                    Loading notes and groups...
                </Loader>
            </div>
            <NewTreeItem
                container={tree.root}
                drag_manager={dragManager}
                tree_manager={tree}
            />
        </>
    );
};
