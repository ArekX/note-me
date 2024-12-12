import { TreeRecord } from "$db";

export type DisplayMode = "view" | "edit";

export type RecordType = "root" | "group" | "note";

export interface RecordContainer {
    id: number | null;
    key: string;
    name: string;
    type: RecordType;
    is_processing: boolean;
    is_open: boolean;
    is_protected: boolean;
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
        is_protected: !!record.is_encrypted,
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
    is_protected: false,
    children_loaded: false,
    has_children: false,
    display_mode: "view",
    children: [],
    ...overrides,
});
