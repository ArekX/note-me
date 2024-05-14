import { useSignal } from "@preact/signals";
import {
    GetTreeMessage,
    GetTreeResponse,
    TreeFrontendResponse,
} from "$workers/websocket/api/tree/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    CreateGroupMessage,
    CreateGroupResponse,
    DeleteGroupMessage,
    UpdateGroupMessage,
    UpdateGroupResponse,
} from "$workers/websocket/api/group/messages.ts";
import { deleteNote, updateGroup, updateNote } from "$frontend/api.ts";
import { useEffect } from "preact/hooks";
import { LoaderHook, useLoader } from "$frontend/hooks/use-loading.ts";

export type DisplayMode = "view" | "edit";

type RecordType = "root" | "group" | "note";

export interface RecordContainer {
    id: number | null;
    name: string;
    type: RecordType;
    is_processing: boolean;
    is_open: boolean;
    children_loaded: boolean;
    has_children: boolean;
    display_mode: DisplayMode;
    parent: RecordContainer | null;
    children: RecordContainer[];
}

const createContainer = (
    overrides: Partial<RecordContainer>,
): RecordContainer => ({
    id: null,
    name: "",
    type: "root",
    is_open: false,
    is_processing: false,
    children_loaded: false,
    has_children: false,
    display_mode: "view",
    parent: null,
    children: [],
    ...overrides,
});

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
    deleteContainer: (container: RecordContainer) => Promise<void>;
    changeParent: (
        container: RecordContainer,
        newParent: RecordContainer,
    ) => Promise<void>;
}

export const useRecordTree = (): RecordTreeHook => {
    const createRootContainer = () =>
        createContainer({ type: "root", has_children: true });

    const tree = useSignal<RecordContainer>(
        createRootContainer(),
    );
    const rootLoader = useLoader(false);

    const { sendMessage, dispatchMessage } = useWebsocketService<
        TreeFrontendResponse
    >({
        messageNamespace: "tree",
        eventMap: {
            // TODO: Propagate events for notes and groups
        },
    });

    const setRootValue = (root: RecordContainer) => {
        tree.value = { ...root, is_open: true };
    };

    const reload = async (container: RecordContainer) => {
        if (container.type === "root") {
            // TODO: Clear tree storage
            setRootValue(createRootContainer());
            await loadChildren(tree.value);
            return;
        }

        container.children_loaded = false;
        container.children = [];
        await loadChildren(container);
    };

    const updateContainer = (
        container: RecordContainer,
        newValues: Partial<RecordContainer>,
    ) => {
        Object.assign(container, newValues);
        propagate(container);
    };

    const propagate = (container: RecordContainer) => {
        container.children = [...container.children];

        if (container.parent) {
            propagate(container.parent);
        } else {
            setRootValue({ ...container });
        }
    };

    const setDisplayMode = (
        container: RecordContainer,
        display_mode: DisplayMode,
    ) => updateContainer(container, { display_mode });

    const setName = (container: RecordContainer, name: string) =>
        updateContainer(container, { name });

    const loadChildren = async (container: RecordContainer) => {
        if (!container.has_children || container.children_loaded) {
            return;
        }

        updateContainer(container, { is_processing: true });

        const { records } = await sendMessage<GetTreeMessage, GetTreeResponse>({
            request: {
                type: "getTree",
                parent_id: container.id ?? undefined,
            },
            require: "getTreeResponse",
        });

        updateContainer(container, {
            is_processing: false,
            children_loaded: true,
            children: records.map((record) =>
                createContainer({
                    id: record.id,
                    name: record.name,
                    type: record.type,
                    parent: container,
                    has_children: !!record.has_children,
                })
            ),
        });
    };

    const save = async (container: RecordContainer) => {
        if (container.type !== "group") {
            // TODO: Note rename should work here
            return;
        }

        let { id, name, parent } = container;

        updateContainer(container, { is_processing: true });

        if (id === null) {
            const { record } = await sendMessage<
                CreateGroupMessage,
                CreateGroupResponse
            >({
                request: {
                    namespace: "groups",
                    type: "createGroup",
                    data: {
                        name,
                        parent_id: parent?.id ?? null,
                    },
                },
                require: "createGroupResponse",
            });
            id = record.id;
        } else {
            await sendMessage<UpdateGroupMessage, UpdateGroupResponse>({
                request: {
                    namespace: "groups",
                    type: "updateGroup",
                    id,
                    data: {
                        name,
                        parent_id: parent?.id ?? null,
                    },
                },
                require: "updateGroupResponse",
            });
        }

        updateContainer(container, {
            id,
            is_processing: false,
        });
    };

    const deleteContainer = async (container: RecordContainer) => {
        if (container.type === "root") {
            return;
        }

        if (container.id !== null) {
            // TODO: Implement via socket properly
            if (container.type === "note") {
                await deleteNote(container.id);
            } else {
                dispatchMessage<DeleteGroupMessage>({
                    namespace: "groups",
                    type: "deleteGroup",
                    id: container.id,
                });
            }
        }

        updateContainer(container, { is_processing: true });

        if (container.parent) {
            updateContainer(container.parent, {
                children: removeFromList(container, container.parent.children),
            });
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

        updateContainer(container, { is_processing: true });

        if (container.type === "note") {
            await updateNote(container.id, {
                group_id: newParent?.id ?? null,
            });
        } else {
            await updateGroup(container.id, {
                parent_id: newParent?.id ?? null,
            });
        }

        const oldParent = container.parent;

        if (oldParent) {
            oldParent.children = removeFromList(container, oldParent.children);

            if (oldParent.children.length === 0) {
                oldParent.has_children = false;
                oldParent.is_open = false;
            }
        }

        newParent.children = addSorted(container, newParent.children);
        newParent.has_children = true;
        newParent.is_open = true;

        container.parent = newParent;
        container.is_processing = false;

        propagate(container);

        if (oldParent) {
            propagate(oldParent);
        }
    };

    const open = async (container: RecordContainer) => {
        updateContainer(container, { is_open: true });

        if (!container.children_loaded) {
            await loadChildren(container);
        }
    };

    const close = (container: RecordContainer) =>
        updateContainer(container, { is_open: false });

    const toggleOpen = (container: RecordContainer) =>
        container.is_open ? close(container) : open(container);

    const addNew = async (
        parent: RecordContainer,
        overrides: Partial<RecordContainer> = {},
    ): Promise<RecordContainer> => {
        await loadChildren(parent);

        const newContainer = createContainer({
            ...overrides,
            parent,
        });

        // TODO: Add proper sorting.
        updateContainer(parent, {
            is_open: true,
            children: addSorted(newContainer, parent.children),
        });

        return newContainer;
    };

    const removeFromList = (
        container: RecordContainer,
        list: RecordContainer[],
    ) => list.filter(
        (child) => {
            return !(child.id === container.id &&
                child.type === container.type);
        },
    );

    const addSorted = (
        container: RecordContainer,
        containers: RecordContainer[],
    ) => {
        const newId = Math.max(...containers.map((c) => c.id ?? -1)) + 1;

        return [...containers, container]
            .sort((a, b) => a.type.localeCompare(b.type))
            .sort((a, b) => {
                if (a.type !== b.type) {
                    return 0;
                }

                const aId = a.id ?? newId;
                const bId = b.id ?? newId;

                return aId - bId;
            });
    };

    useEffect(() => {
        rootLoader.start();
        loadChildren(tree.value).then(() => rootLoader.stop());
    }, []);

    return {
        root: tree.value,
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
