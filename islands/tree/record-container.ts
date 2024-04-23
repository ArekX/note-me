import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { useSignal } from "@preact/signals";
import {
    GetTreeMessage,
    GetTreeResponse,
    TreeFrontendResponse,
} from "$workers/websocket/api/tree/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";

export type ContainerMode = "view" | "edit";

type RecordType = "root" | "group" | "note";

export interface RecordContainer {
    id: number | null;
    name: string;
    type: RecordType;
    is_processing: boolean;
    is_open: boolean;
    children_loaded: boolean;
    mode: ContainerMode;
    parent: RecordContainer | null;
    children: RecordContainer[];
}

interface ContainerData {
    record?: TreeRecord | null;
    type?: RecordType | null;
}

const createContainer = ({ record, type }: ContainerData): RecordContainer => ({
    id: record?.id ?? null,
    name: record?.name ?? "",
    type: type ?? record?.type ?? "root",
    is_open: false,
    is_processing: false,
    children_loaded: false,
    mode: "view",
    parent: null,
    children: [],
});

export const useRecordTree = () => {
    const tree = useSignal<RecordContainer>(createContainer({ type: "root" }));

    const { sendMessage } = useWebsocketService<
        TreeFrontendResponse
    >({
        messageNamespace: "tree",
    });

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
            tree.value = { ...container };
        }
    };

    const setMode = (container: RecordContainer, mode: ContainerMode) =>
        updateContainer(container, { mode });

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
            children: records.map((record) => createContainer({ record })),
        });
    };

    return {
        root: tree.value,
        setMode,
        loadChildren,
    };
};
