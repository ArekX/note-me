import {
    GetTreeMessage,
    GetTreeResponse,
} from "$workers/websocket/api/tree/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    CreateGroupMessage,
    CreateGroupResponse,
    DeleteGroupMessage,
    GroupFrontendResponse,
    UpdateGroupMessage,
    UpdateGroupResponse,
} from "$workers/websocket/api/group/messages.ts";
import { updateGroup, updateNote } from "$frontend/api.ts";
import { useEffect } from "preact/hooks";
import { LoaderHook, useLoader } from "$frontend/hooks/use-loading.ts";
import { useTreeState } from "./use-tree-state.ts";
import {
    createContainer,
    DisplayMode,
    fromTreeRecord,
    RecordContainer,
} from "$islands/tree/hooks/record-container.ts";
import {
    DeleteNoteMessage,
    NoteFrontendResponse,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";

export interface RecordTreeHook {
    root: RecordContainer;
    root_loader: LoaderHook;
    reload: (container: RecordContainer) => Promise<void>;
    setDisplayMode: (
        container: RecordContainer,
        display_mode: DisplayMode,
    ) => void;
    setName: (container: RecordContainer, name: string) => void;
    loadChildren: (container: RecordContainer) => Promise<void>;
    open: (container: RecordContainer) => void;
    toggleOpen: (container: RecordContainer) => void;
    close: (container: RecordContainer) => void;
    addNew: (
        parent: RecordContainer,
        overrides: Partial<RecordContainer>,
    ) => Promise<RecordContainer>;
    save: (container: RecordContainer) => Promise<void>;
    deleteContainer: (container: RecordContainer) => void;
    changeParent: (
        container: RecordContainer,
        newParent: RecordContainer,
    ) => Promise<void>;
}

export const useRecordTree = (): RecordTreeHook => {
    const {
        tree,
        addChild,
        setRoot,
        setContainer,
        removeFromParent,
        findContainerById,
        findParent,
        propagateChanges,
    } = useTreeState();

    const createRootContainer = () =>
        createContainer({ type: "root", has_children: true, is_open: true });

    const rootLoader = useLoader(false);

    const { sendMessage, dispatchMessage } = useWebsocketService<
        NoteFrontendResponse | GroupFrontendResponse
    >({
        eventMap: {
            notes: {
                deleteNoteResponse: (data) => {
                    const container = findContainerById(data.deletedId, "note");
                    if (container) {
                        removeFromParent(container);
                        propagateChanges();
                    }
                },
            },
            groups: {
                deleteGroupResponse: (data) => {
                    const container = findContainerById(
                        data.deletedId,
                        "group",
                    );
                    if (container) {
                        removeFromParent(container);
                        propagateChanges();
                    }
                },
            },
        },
    });

    const reload = async (container: RecordContainer) => {
        if (container.type === "root") {
            const newRoot = createRootContainer();
            await loadChildren(newRoot);
            setRoot(newRoot);
            return;
        }

        container.children_loaded = false;
        container.children = [];
        await loadChildren(container);
    };

    const setDisplayMode = (
        container: RecordContainer,
        display_mode: DisplayMode,
    ) => {
        setContainer(container, { display_mode });
        propagateChanges();
    };

    const setName = (container: RecordContainer, name: string) => {
        setContainer(container, { name });
        propagateChanges();
    };

    const loadChildren = async (container: RecordContainer) => {
        if (!container.has_children || container.children_loaded) {
            return;
        }

        setContainer(container, { is_processing: true });

        const { records } = await sendMessage<GetTreeMessage, GetTreeResponse>(
            "tree",
            "getTree",
            {
                data: { parent_id: container.id ?? undefined },
                expect: "getTreeResponse",
            },
        );

        setContainer(container, {
            is_processing: false,
            children_loaded: true,
            children: records.map(fromTreeRecord),
        });

        propagateChanges();
    };

    const save = async (container: RecordContainer) => {
        if (container.type !== "group") {
            await sendMessage<UpdateNoteMessage, UpdateNoteResponse>(
                "notes",
                "updateNote",
                {
                    data: {
                        id: container.id!,
                        data: {
                            title: container.name,
                        },
                    },
                    expect: "updateNoteResponse",
                },
            );
            return;
        }

        let { id, name } = container;

        setContainer(container, { is_processing: true });

        const parent = findParent(container);

        if (id === null) {
            const { record } = await sendMessage<
                CreateGroupMessage,
                CreateGroupResponse
            >(
                "groups",
                "createGroup",
                {
                    data: {
                        data: {
                            name,
                            parent_id: parent?.id ?? null,
                        },
                    },
                    expect: "createGroupResponse",
                },
            );
            id = record.id;
        } else {
            await sendMessage<UpdateGroupMessage, UpdateGroupResponse>(
                "groups",
                "updateGroup",
                {
                    data: {
                        id,
                        data: {
                            name,
                            parent_id: parent?.id ?? null,
                        },
                    },
                    expect: "updateGroupResponse",
                },
            );
        }

        setContainer(container, { id, is_processing: false });
        propagateChanges();
    };

    const deleteContainer = (container: RecordContainer) => {
        if (container.type === "root") {
            return;
        }

        setContainer(container, { is_processing: true });

        propagateChanges();

        if (container.id !== null) {
            if (container.type === "note") {
                dispatchMessage<DeleteNoteMessage>("notes", "deleteNote", {
                    id: container.id,
                });
            } else {
                dispatchMessage<DeleteGroupMessage>("groups", "deleteGroup", {
                    id: container.id,
                });
            }
        }
    };

    const changeParent = async (
        container: RecordContainer,
        newParent: RecordContainer,
    ) => {
        if (container.id === null) {
            throw new Error("Cannot cahnge parent to a new container");
        }

        if (newParent.has_children && !newParent.children_loaded) {
            await open(newParent);
        }

        setContainer(container, { is_processing: true });

        if (container.type === "note") {
            await updateNote(container.id, {
                group_id: newParent?.id ?? null,
            });
        } else {
            await updateGroup(container.id, {
                parent_id: newParent?.id ?? null,
            });
        }

        removeFromParent(container);
        addChild(newParent, container);
        setContainer(container, { is_processing: false });
        propagateChanges();
    };

    const open = async (container: RecordContainer) => {
        setContainer(container, { is_open: true });

        if (!container.children_loaded) {
            await loadChildren(container);
        } else {
            propagateChanges();
        }
    };

    const close = (container: RecordContainer) => {
        setContainer(container, { is_open: false });
        propagateChanges();
    };

    const toggleOpen = (container: RecordContainer) =>
        container.is_open ? close(container) : open(container);

    const addNew = async (
        parent: RecordContainer,
        overrides: Partial<RecordContainer> = {},
    ): Promise<RecordContainer> => {
        await loadChildren(parent);

        const newContainer = createContainer({ ...overrides });

        setContainer(parent, { is_open: true });
        addChild(parent, newContainer);

        propagateChanges();

        return newContainer;
    };

    useEffect(() => {
        if (tree.children_loaded) {
            return;
        }

        rootLoader.start();
        loadChildren(tree).then(() => rootLoader.stop());
    }, []);

    return {
        root: tree,
        root_loader: rootLoader,
        reload,
        setDisplayMode,
        setName,
        loadChildren,
        addNew,
        toggleOpen,
        open,
        close,
        save,
        deleteContainer,
        changeParent,
    };
};
