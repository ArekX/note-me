import { ContainerGroupRecord } from "./TreeItem.tsx";
import { restore, store } from "$frontend/session-storage.ts";

let restoredTreeList: ContainerGroupRecord[] | null = null;

export const storeTreeList = (
    records: ContainerGroupRecord[],
): void => {
    function processChildren(records: ContainerGroupRecord[]) {
        const results = [];
        for (const record of records) {
            const result: ContainerGroupRecord = {
                ...record,
                parent: null,
                children: processChildren(record.children),
            };
            results.push(result);
        }

        return results;
    }

    store("treeList", processChildren(records));
};

export const restoreTreeList = (): ContainerGroupRecord[] => {
    if (restoredTreeList) {
        return restoredTreeList;
    }

    const restoredList: ContainerGroupRecord[] = restore<
        ContainerGroupRecord[]
    >("treeList", []) ?? [];

    function restoreChildren(
        records: ContainerGroupRecord[],
        parent: ContainerGroupRecord | null,
    ) {
        for (const record of records) {
            record.parent = parent;
            restoreChildren(record.children, record);
        }
    }

    restoreChildren(restoredList, null);

    restoredTreeList = restoredList;

    return restoredList;
};

export const getSortedContainerRecords = (records: ContainerGroupRecord[]) => {
    return records.toSorted((a, b) => a.record.id - b.record.id).toSorted(
        (a, b) => {
            if (a.record.type == "group" && b.record.type == "note") {
                return -1;
            }
            if (a.record.type == "note" && b.record.type == "group") {
                return 1;
            }

            return 0;
        },
    );
};

restoreTreeList();
