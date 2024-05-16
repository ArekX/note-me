import { ComponentChild } from "preact";
import { useRecordTree } from "./hooks/use-record-tree.ts";
import RootGroupBar from "$islands/tree/RootGroupBar.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Loader from "$islands/Loader.tsx";
import { useDragManager } from "$islands/tree/hooks/use-drag-manager.ts";
import NewTreeItem from "./TreeItem.tsx";
import { Icon } from "$components/Icon.tsx";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";

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
                dragManager={dragManager}
                treeManager={tree}
                switcherComponent={switcherComponent}
            />
            <div class="overflow-auto group-list">
                <Loader
                    color="white"
                    visible={tree.root_loader.running}
                    displayType="center-block"
                >
                    Loading notes and groups...
                </Loader>
                {!tree.root_loader.running &&
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
                {tree.root.children.map((container) => (
                    <NewTreeItem
                        container={container}
                        dragManager={dragManager}
                        treeManager={tree}
                    />
                ))}
            </div>
        </>
    );
};
