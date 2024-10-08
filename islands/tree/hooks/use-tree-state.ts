import { restore, store } from "$frontend/session-storage.ts";
import { useState } from "preact/hooks";
import {
    createRootContainer,
    RecordContainer,
    RecordType,
} from "$islands/tree/hooks/record-container.ts";
import {
    consumePropagationTicket,
    createPropagationTicket,
    TicketId,
} from "$frontend/propagation-manager.ts";
import { signal } from "@preact/signals";

export interface TreeStateHook {
    tree: RecordContainer;
    groupDelete: GroupDelete | null;
    setRoot: (container: RecordContainer) => void;
    addChild: (parent: RecordContainer, child: RecordContainer) => void;
    findParent: (searchContainer: RecordContainer) => RecordContainer | null;
    removeFromParent: (container: RecordContainer) => void;
    startGroupDelete: (groupId: number) => void;
    endGroupDelete: () => void;
    setContainer: (
        container: RecordContainer,
        values: Partial<RecordContainer>,
    ) => void;
    findContainerById: (
        id: number,
        type: RecordType,
    ) => RecordContainer | null;
    changeParent: (
        container: RecordContainer,
        newParentId: number | null,
    ) => void;
    propagateChanges: () => void;
}

export interface GroupDelete {
    groupId: number;
    propagationTicket: TicketId;
}

const treeState = signal<RecordContainer>(
    restore<RecordContainer>(
        "treeStorage",
    ) ?? createRootContainer(),
);

export const useTreeState = (): TreeStateHook => {
    const tree = treeState.value;
    const [groupDelete, setGroupDelete] = useState<GroupDelete | null>(null);

    const propagateChanges = () => setRoot(JSON.parse(JSON.stringify(tree)));

    const setContainer = (
        container: RecordContainer,
        values: Partial<RecordContainer>,
    ) => {
        Object.assign(container, values);
    };

    const startGroupDelete = (groupId: number) => {
        setGroupDelete({
            groupId,
            propagationTicket: createPropagationTicket(),
        });
    };

    const endGroupDelete = async () => {
        setGroupDelete(null);
        if (groupDelete) {
            await consumePropagationTicket(groupDelete.propagationTicket);
        }
    };

    const findContainerById = (
        id: number,
        type: RecordType,
    ): RecordContainer | null => {
        const find = (container: RecordContainer): RecordContainer | null => {
            if (container.id === id && container.type === type) {
                return container;
            }

            for (const child of container.children) {
                const result = find(child);

                if (result) {
                    return result;
                }
            }

            return null;
        };

        return find(tree);
    };

    const findParent = (
        searchContainer: RecordContainer,
    ): RecordContainer | null => {
        const find = (container: RecordContainer): RecordContainer | null => {
            for (const child of container.children) {
                if (child === searchContainer) {
                    return container;
                }

                const result = find(child);

                if (result) {
                    return result;
                }
            }

            return null;
        };

        return find(tree);
    };

    const removeFromParent = (container: RecordContainer) => {
        const parent = findParent(container);

        if (!parent) {
            return;
        }

        parent.children.splice(parent.children.indexOf(container), 1);

        if (parent.children.length === 0) {
            parent.has_children = false;
            parent.is_open = false;
        }
    };

    const changeParent = (
        container: RecordContainer,
        newParentId: number | null,
    ): void => {
        const parent = newParentId
            ? findContainerById(
                newParentId,
                "group",
            )
            : tree;

        removeFromParent(container);

        if (parent) {
            addChild(parent, container);
        }
    };

    const setRoot = (container: RecordContainer) => {
        treeState.value = container;
        storeTree(container);
    };

    const storeTree = (tree: RecordContainer) => {
        store("treeStorage", tree);
    };

    const addChild = (parent: RecordContainer, child: RecordContainer) => {
        insertSorted(child, parent.children);

        if (!parent.has_children) {
            parent.has_children = true;
            parent.children_loaded = true;
            parent.is_open = true;
        }
    };

    const insertSorted = (
        container: RecordContainer,
        containers: RecordContainer[],
    ) => {
        const newId = Math.max(...containers.map((c) => c.id ?? -1)) + 1;

        containers.push(container);

        containers
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

    return {
        tree,
        groupDelete,
        setRoot,
        addChild,
        findParent,
        removeFromParent,
        setContainer,
        changeParent,
        findContainerById,
        propagateChanges,
        startGroupDelete,
        endGroupDelete,
    };
};
