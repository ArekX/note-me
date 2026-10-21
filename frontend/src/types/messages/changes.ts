import type { Message } from "./base";

export type DataEntity =
    | "note"
    | "group"
    | "reminder"
    | "share"
    | "tag"
    | "file"
    | "notification"
    | "user"
    | "backup"
    | "backupTarget"
    | "periodicTask"
    | "aiProvider";

// Numbers, or strings for entities keyed by an identifier (files, backups,
// periodic tasks).
export type DataChangedResponse = Message<
    "changes",
    "dataChanged",
    { entity: DataEntity; ids: Array<number | string> }
>;

export type ChangesFrontendResponse = DataChangedResponse;
