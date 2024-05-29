import { Generated } from "../lib/kysely-sqlite-dialect/deps.ts";
import { Roles } from "$backend/rbac/role-definitions.ts";

export interface UserTable {
    id: Generated<number>;
    name: string;
    username: string;
    password: string;
    role: Roles;
    timezone: string;
    created_at: number;
    updated_at: number;
    is_deleted?: boolean;
}

export interface NoteTable {
    id: Generated<number>;
    title: string;
    note: string;
    user_id: number;
    created_at: number;
    updated_at: number;
    is_deleted?: boolean;
}

export interface NoteReminderTable {
    id: Generated<number>;
    note_id: number;
    user_id: number;
    target_notification_id?: number | null;
    remind_at: number;
    repeat_amount: number;
}

export interface NoteAttachmentTable {
    id: Generated<number>;
    note_id: number;
    user_id: number;
    data: Uint8Array;
    mime_type: string;
    created_at: number;
}

export interface NoteHistoryTable {
    id: Generated<number>;
    note_id: number;
    user_id: number;
    note: string;
    created_at: number;
}

export interface NoteTagTable {
    id: Generated<number>;
    name: string;
    user_id: number;
    created_at: number;
}

export interface NoteTagNoteTable {
    id: Generated<number>;
    note_id: number;
    tag_id: number;
}

export interface SessionTable {
    id: Generated<number>;
    user_id: number;
    key: string;
    data: string;
    expires_at: number;
}

export interface NotificationTable {
    id: Generated<number>;
    data: string;
    created_at: number;
    is_read: boolean;
    is_deleted: boolean;
    user_id: number;
}

export interface GroupTable {
    id: Generated<number>;
    name: string;
    created_at: number;
    user_id: number;
    parent_id: number | null;
    is_deleted?: boolean;
}

export interface GroupNoteTable {
    id: Generated<number>;
    group_id?: number | null;
    note_id: number;
    user_id: number;
}

export interface Tables {
    note: NoteTable;
    note_reminder: NoteReminderTable;
    note_attachment: NoteAttachmentTable;
    note_history: NoteHistoryTable;
    note_tag: NoteTagTable;
    note_tag_note: NoteTagNoteTable;
    notification: NotificationTable;
    group: GroupTable;
    session: SessionTable;
    group_note: GroupNoteTable;
    user: UserTable;
}
