import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
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
    display_mode: DisplayMode;
    parent: RecordContainer | null;
    children: RecordContainer[];
}

interface ContainerData {
    record?: TreeRecord | null;
    parent?: RecordContainer;
    type?: RecordType | null;
    name?: string;
}

const createContainer = (
    { record, parent, type, name = "" }: ContainerData,
): RecordContainer => ({
    id: record?.id ?? null,
    name: record?.name ?? name,
    type: type ?? record?.type ?? "root",
    is_open: false,
    is_processing: false,
    children_loaded: false,
    display_mode: "view",
    parent: parent ?? null,
    children: [],
});

export interface RecordTreeHook {
    root: RecordContainer;
    root_loader: LoaderHook;
    reloadTree: () => Promise<void>;
    setDisplayMode: (
        container: RecordContainer,
        display_mode: DisplayMode,
    ) => void;
    setName: (container: RecordContainer, name: string) => void;
    loadChildren: (container: RecordContainer) => Promise<void>;
    open: (container: RecordContainer) => void;
    close: (container: RecordContainer) => void;
    addNew: (
        parent: RecordContainer,
        type: RecordContainer["type"],
    ) => Promise<RecordContainer>;
    save: (container: RecordContainer) => Promise<void>;
    deleteContainer: (container: RecordContainer) => Promise<void>;
    swapParent: (
        container: RecordContainer,
        newParent: RecordContainer,
    ) => Promise<void>;
}

export const useRecordTree = (): RecordTreeHook => {
    const tree = useSignal<RecordContainer>(createContainer({ type: "root" }));
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

    const reloadTree = async () => {
        // TODO: Clear tree storage
        setRootValue(createContainer({ type: "root" }));
        await loadChildren(tree.value);
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
        if (container.children_loaded) {
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
                createContainer({ record, parent: container })
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
                children: container.parent.children.filter(
                    (child) => child !== container,
                ),
            });
        }
    };

    const swapParent = async (
        container: RecordContainer,
        newParent: RecordContainer,
    ) => {
        if (container.id === null) {
            throw new Error("Cannot swap parent for a new container");
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

        if (container.parent) {
            updateContainer(container.parent, {
                children: container.parent.children.filter(
                    (child) => child !== container,
                ),
            });
        }

        updateContainer(newParent, {
            children: [...newParent.children, container],
        });

        updateContainer(container, {
            parent: newParent,
            is_processing: false,
        });
    };

    const open = async (container: RecordContainer) => {
        updateContainer(container, { is_open: true });

        if (!container.children_loaded) {
            await loadChildren(container);
        }
    };

    const close = (container: RecordContainer) =>
        updateContainer(container, { is_open: false });

    const addNew = async (
        parent: RecordContainer,
        type: RecordContainer["type"],
    ): Promise<RecordContainer> => {
        if (!parent.children_loaded) {
            await loadChildren(parent);
        }

        const newContainer = createContainer({
            type,
        });

        // TODO: Add proper sorting.
        updateContainer(parent, {
            children: [...parent.children, newContainer],
        });

        return newContainer;
    };

    useEffect(() => {
        rootLoader.start();
        loadChildren(tree.value).then(() => rootLoader.stop());
    }, []);

    return {
        root: tree.value,
        root_loader: rootLoader,
        reloadTree,
        setDisplayMode,
        setName,
        loadChildren,
        addNew,
        open,
        close,
        save,
        deleteContainer,
        swapParent,
    };
};
