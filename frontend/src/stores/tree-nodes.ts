import { reactive } from "vue";
import type { GroupRecord, NoteRecord, TreeRecord } from "@/types/records";
import type { UpdateGroupRequest } from "@/schemas/groups";
import type { UpdateNoteRequest } from "@/schemas/notes";

export type TreeNodeType = "root" | "group" | "note";

export interface TreeNode {
    key: string;
    id: number | null;
    type: TreeNodeType;
    name: string;
    is_protected: boolean;
    has_children: boolean;
    children_loaded: boolean;
    parent: string | null;
    children: string[];
}

export const ROOT_KEY = "root";

export const nodeKey = (type: "group" | "note", id: number) => `${type}-${id}`;

export const groupKey = (id: number | null) =>
    id === null ? ROOT_KEY : nodeKey("group", id);

export const isUnsaved = (key: string) => key.startsWith("new-");

export const createRoot = (): TreeNode => ({
    key: ROOT_KEY,
    id: null,
    type: "root",
    name: "",
    is_protected: false,
    has_children: true,
    children_loaded: false,
    parent: null,
    children: [],
});

export const nodeFromRecord = (record: TreeRecord): TreeNode => ({
    key: nodeKey(record.type, record.id),
    id: record.id,
    type: record.type,
    name: record.name,
    is_protected: !!record.is_encrypted,
    has_children: !!record.has_children,
    children_loaded: !record.has_children,
    parent: null,
    children: [],
});

export const noteNode = (note: {
    id: number;
    title: string;
    is_encrypted: boolean | number;
}): TreeNode =>
    nodeFromRecord({
        type: "note",
        id: note.id,
        name: note.title,
        is_encrypted: +note.is_encrypted,
        has_children: 0,
    });

// Groups before notes, then by id; unsaved items go last.
const compareNodes = (a: TreeNode, b: TreeNode) => {
    if (a.type !== b.type) {
        return a.type === "group" ? -1 : 1;
    }
    return (a.id ?? Infinity) - (b.id ?? Infinity);
};

export const createTreeNodes = (
    initialNodes: Record<string, TreeNode>,
    initialOpen: string[],
) => {
    const nodes = reactive<Record<string, TreeNode>>(initialNodes);
    const openKeys = reactive(new Set<string>(initialOpen));
    const processingKeys = reactive(new Set<string>());
    const editingKeys = reactive(new Set<string>());

    const childrenOf = (key: string): TreeNode[] =>
        (nodes[key]?.children ?? [])
            .map((child) => nodes[child])
            .filter((node): node is TreeNode => !!node);

    const isWithin = (key: string, ancestorKey: string): boolean => {
        for (let at: string | null = key; at !== null;) {
            if (at === ancestorKey) {
                return true;
            }
            at = nodes[at]?.parent ?? null;
        }
        return false;
    };

    const canDropTo = (sourceKey: string, targetKey: string): boolean => {
        const source = nodes[sourceKey];
        const target = nodes[targetKey];
        return (
            !!source &&
            !!target &&
            source.type !== "root" &&
            target.type !== "note" &&
            source.parent !== targetKey &&
            !isWithin(targetKey, sourceKey)
        );
    };

    const sortChildren = (parent: TreeNode) => {
        parent.children.sort((a, b) => compareNodes(nodes[a]!, nodes[b]!));
    };

    const detach = (parent: TreeNode, key: string) => {
        parent.children = parent.children.filter((child) => child !== key);
        if (parent.children.length === 0 && parent.children_loaded) {
            parent.has_children = false;
            openKeys.delete(parent.key);
        }
    };

    const removeSubtree = (key: string) => {
        const node = nodes[key];
        if (!node) {
            return;
        }

        const parent = node.parent ? nodes[node.parent] : null;
        if (parent) {
            detach(parent, key);
        }

        const remove = (removeKey: string) => {
            nodes[removeKey]?.children.forEach(remove);
            delete nodes[removeKey];
            openKeys.delete(removeKey);
            processingKeys.delete(removeKey);
            editingKeys.delete(removeKey);
        };
        remove(key);
    };

    // A parent whose children are not loaded yet only learns that it has
    // children; the node is fetched with the rest when it is opened.
    const attach = (parentKey: string, node: TreeNode) => {
        const parent = nodes[parentKey];
        if (!parent || (parent.has_children && !parent.children_loaded)) {
            removeSubtree(node.key);
            if (parent) {
                parent.has_children = true;
            }
            return;
        }

        const oldParent = nodes[node.key]?.parent;
        if (oldParent && nodes[oldParent]) {
            detach(nodes[oldParent], node.key);
        }

        nodes[node.key] = node;
        node.parent = parentKey;
        parent.children.push(node.key);
        parent.has_children = true;
        parent.children_loaded = true;
        sortChildren(parent);
    };

    const setChildren = (parentKey: string, records: TreeRecord[]) => {
        const parent = nodes[parentKey];
        if (!parent) {
            return;
        }

        const keys = records.map((record) => nodeKey(record.type, record.id));

        for (const child of [...parent.children]) {
            if (!isUnsaved(child) && !keys.includes(child)) {
                removeSubtree(child);
            }
        }

        for (const record of records) {
            const fresh = nodeFromRecord(record);
            const existing = nodes[fresh.key];

            if (existing && existing.parent !== parentKey) {
                removeSubtree(fresh.key);
            }

            const node = nodes[fresh.key];
            if (!node) {
                nodes[fresh.key] = { ...fresh, parent: parentKey };
                continue;
            }

            node.name = fresh.name;
            node.is_protected = fresh.is_protected;
            if (!fresh.has_children) {
                [...node.children].forEach(removeSubtree);
                node.children_loaded = true;
            }
            node.has_children = fresh.has_children;
        }

        parent.children = [
            ...keys,
            ...parent.children.filter((child) => isUnsaved(child)),
        ];
        parent.children_loaded = true;
        parent.has_children = parent.children.length > 0;
        if (!parent.has_children) {
            openKeys.delete(parentKey);
        }
        sortChildren(parent);
    };

    const moveTo = (node: TreeNode, parentId: number | null | undefined) => {
        if (parentId === undefined) {
            return;
        }
        const parentKey = groupKey(parentId);
        if (parentKey !== node.parent) {
            attach(parentKey, node);
        }
    };

    const addGroup = (record: GroupRecord) => {
        if (!nodes[nodeKey("group", record.id)]) {
            attach(
                groupKey(record.parent_id),
                nodeFromRecord({
                    type: "group",
                    id: record.id,
                    name: record.name,
                    is_encrypted: 0,
                    has_children: 0,
                }),
            );
        }
    };

    const addNote = (
        parentId: number | null,
        record: Pick<NoteRecord, "id" | "title" | "is_encrypted">,
    ) => {
        if (!nodes[nodeKey("note", record.id)]) {
            attach(groupKey(parentId), noteNode(record));
        }
    };

    // Both return false when the node is not loaded.
    const updateGroup = (id: number, data: UpdateGroupRequest): boolean => {
        const node = nodes[nodeKey("group", id)];
        if (!node) {
            return false;
        }
        if (data.name !== undefined) {
            node.name = data.name;
        }
        moveTo(node, data.parent_id);
        return true;
    };

    const updateNote = (
        id: number,
        data: Pick<UpdateNoteRequest, "title" | "is_encrypted" | "group_id">,
    ): boolean => {
        const node = nodes[nodeKey("note", id)];
        if (!node) {
            return false;
        }
        if (data.title !== undefined) {
            node.name = data.title;
        }
        if (data.is_encrypted !== undefined) {
            node.is_protected = data.is_encrypted;
        }
        moveTo(node, data.group_id);
        return true;
    };

    // The loaded part of the tree gives the whole path; otherwise only the
    // note's own group is known.
    const groupPath = (groupId: number | null, groupName: string | null) => {
        if (groupId === null) {
            return [];
        }
        const path: { id: number; name: string }[] = [];
        let node: TreeNode | undefined = nodes[nodeKey("group", groupId)];
        while (node && node.id !== null) {
            path.unshift({ id: node.id, name: node.name });
            node = node.parent ? nodes[node.parent] : undefined;
        }
        return path.length > 0
            ? path
            : [{ id: groupId, name: groupName ?? "" }];
    };

    const unload = (node: TreeNode) => {
        node.children_loaded = false;
        [...node.children].forEach(removeSubtree);
    };

    const addUnsavedGroup = (parentKey: string): string | null => {
        const parent = nodes[parentKey];
        if (!parent) {
            return null;
        }

        const key = `new-${crypto.randomUUID()}`;
        nodes[key] = {
            key,
            id: null,
            type: "group",
            name: "",
            is_protected: false,
            has_children: false,
            children_loaded: true,
            parent: parentKey,
            children: [],
        };
        parent.children.push(key);
        parent.has_children = true;
        parent.children_loaded = true;
        openKeys.add(parentKey);
        return key;
    };

    const clear = () => {
        for (const key of Object.keys(nodes)) {
            delete nodes[key];
        }
        nodes[ROOT_KEY] = createRoot();
        openKeys.clear();
        openKeys.add(ROOT_KEY);
        processingKeys.clear();
        editingKeys.clear();
    };

    const snapshot = () => {
        const saved: Record<string, TreeNode> = {};
        for (const [key, node] of Object.entries(nodes)) {
            if (!isUnsaved(key)) {
                saved[key] = {
                    ...node,
                    children: node.children.filter(
                        (child) => !isUnsaved(child),
                    ),
                };
            }
        }
        return { nodes: saved, open: [...openKeys] };
    };

    return {
        nodes,
        openKeys,
        processingKeys,
        editingKeys,
        childrenOf,
        canDropTo,
        removeSubtree,
        attach,
        setChildren,
        addGroup,
        addNote,
        updateGroup,
        updateNote,
        groupPath,
        unload,
        addUnsavedGroup,
        clear,
        snapshot,
    };
};
