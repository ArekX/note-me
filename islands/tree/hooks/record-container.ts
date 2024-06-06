import { TreeRecord } from "$backend/repository/tree-list.repository.ts";

export type DisplayMode = "view" | "edit";

export type RecordType = "root" | "group" | "note";

export interface RecordContainer {
    id: number | null;
    key: string;
    name: string;
    type: RecordType;
    is_processing: boolean;
    is_open: boolean;
    children_loaded: boolean;
    has_children: boolean;
    display_mode: DisplayMode;
    children: RecordContainer[];
}

export const createRootContainer = () =>
    createContainer({ type: "root", has_children: true, is_open: true });

export const fromTreeRecord = (
    record: TreeRecord,
): RecordContainer =>
    createContainer({
        id: record.id,
        name: record.name,
        type: record.type,
        has_children: !!record.has_children,
    });

export const createContainer = (
    overrides: Partial<RecordContainer>,
): RecordContainer => ({
    id: null,
    name: "",
    key: crypto.randomUUID(),
    type: "root",
    is_open: false,
    is_processing: false,
    children_loaded: false,
    has_children: false,
    display_mode: "view",
    children: [],
    ...overrides,
});
