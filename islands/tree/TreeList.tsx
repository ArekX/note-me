import { ComponentChild } from "preact";
import { useRecordTree } from "./hooks/use-record-tree.ts";
import RootGroupBar from "$islands/tree/RootGroupBar.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Loader from "$islands/Loader.tsx";
import { useDragManager } from "$frontend/hooks/use-drag-manager.ts";
import TreeItem from "./TreeItem.tsx";
import Icon from "$components/Icon.tsx";
import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import { DeleteGroupProgressDialog } from "$islands/tree/DeleteGroupProgressDialog.tsx";
import NoItemMessage from "../sidebar/NoItemMessage.tsx";
import { useEffect } from "preact/hooks";
import { useSearch } from "$frontend/hooks/use-search.ts";
import SidebarPanelContents from "$islands/sidebar/SidebarPanelContents.tsx";

interface TreeListProps {
    switcherComponent: ComponentChild;
}

export default function TreeList({
    switcherComponent,
}: TreeListProps) {
    const search = useSearch();
    const tree = useRecordTree();
    const dragManager = useDragManager<RecordContainer>();

    useEffect(() => {
        search.setType("general");
    }, []);

    return (
        <SidebarPanelContents
            controlPanel={
                <RootGroupBar
                    dragManager={dragManager}
                    treeManager={tree}
                    switcherComponent={switcherComponent}
                />
            }
        >
            <div class="note-container">
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
                            class="cursor-pointer"
                            onClick={() => redirectTo.newNote()}
                        >
                            <NoItemMessage
                                icon="note"
                                message={
                                    <>
                                        Add your first note with{" "}
                                        <Icon name="plus" />!
                                    </>
                                }
                            />
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
        </SidebarPanelContents>
    );
}
