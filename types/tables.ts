import { Generated } from "$lib/kysely-sqlite-dialect/deps.ts";
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
    last_open_at: number | null;
    is_deleted?: boolean;
}

export interface NoteReminderTable {
    id: Generated<number>;
    note_id: number;
    user_id: number;
    next_at: number;
    interval?: number | null;
    unit_value?: number | null;
    repeat_count: number;
    done_count: number;
}

export interface FileTable {
    id: Generated<number>;
    identifier: string;
    name: string;
    user_id: number;
    data?: Uint8Array;
    size: number;
    mime_type: string;
    created_at: number;
    is_ready?: boolean;
    is_public?: boolean;
}

export interface NoteShareUserTable {
    id: Generated<number>;
    note_id: number;
    user_id: number;
    created_at: number;
}

export interface NoteShareLinkTable {
    id: Generated<number>;
    identifier: string;
    note_id: number;
    created_at: number;
    expires_at: number | null;
}

export interface NoteHistoryTable {
    id: Generated<number>;
    note_id: number;
    note: string;
    title: string;
    tags: string;
    version: string;
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

export interface PeriodicTaskScheduleTable {
    id: Generated<number>;
    task_identifier: string;
    next_run_at: number;
    is_last_run_successful?: boolean;
    last_successful_run_at?: number | null;
    last_fail_run_at?: number | null;
    last_fail_reason?: string | null;
}

export interface Tables {
    note: NoteTable;
    note_reminder: NoteReminderTable;
    file: FileTable;
    note_history: NoteHistoryTable;
    note_share_user: NoteShareUserTable;
    note_share_link: NoteShareLinkTable;
    note_tag: NoteTagTable;
    note_tag_note: NoteTagNoteTable;
    notification: NotificationTable;
    group: GroupTable;
    session: SessionTable;
    group_note: GroupNoteTable;
    user: UserTable;
    periodic_task_schedule: PeriodicTaskScheduleTable;
}
