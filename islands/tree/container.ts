import { TreeRecord } from "$backend/repository/tree-list.repository.ts";

export interface ContainerRecord {
    is_new_record: boolean;
    is_processing: boolean;
    are_children_loaded: boolean;
    is_open: boolean;
    edit_mode: boolean;
    error_message: string;
    name: string;
    record: TreeRecord;
    parent: ContainerRecord | null;
    children: ContainerRecord[];
}

export const createNewContainerRecord = (
    parent: ContainerRecord | null,
): ContainerRecord => {
    return {
        ...createContainer(
            {
                id: 0,
                type: "group",
                name: "",
                has_children: 0,
            },
            parent,
        ),
        is_new_record: true,
        edit_mode: true,
    };
};

export const createContainer = (
    record: TreeRecord,
    parent: ContainerRecord | null,
): ContainerRecord => {
    return {
        is_new_record: false,
        is_processing: false,
        are_children_loaded: false,
        is_open: false,
        edit_mode: false,
        error_message: "",
        name: record.name,
        record,
        parent,
        children: [],
    };
};

type RecordActions = "open" | "close" | "edit";

export type ContainerMode = "view" | "open" | "close" | "edit";

export interface RecordContainer {
    is_processing: boolean;
    mode: ContainerMode;
    name: string;
    record: TreeRecord;
    parent: RecordContainer | null;
    children: RecordContainer[];
}
