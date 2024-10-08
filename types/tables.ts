import { Generated } from "$lib/kysely-sqlite-dialect/deps.ts";
import { Roles } from "$backend/rbac/role-definitions.ts";

export interface UserTable {
    id: Generated<number>;
    name: string;
    username: string;
    password: string;
    role: Roles;
    timezone: string;
    onboarding_state?: string;
    encryption_key: string;
    created_at: number;
    updated_at: number;
    is_deleted?: boolean;
    is_password_reset_required?: boolean;
}

export interface NoteTable {
    id: Generated<number>;
    title: string;
    note: string;
    is_encrypted: boolean;
    user_id: number;
    created_at: number;
    updated_at: number;
    last_open_at: number | null;
    is_deleted?: boolean;
    deleted_at?: number | null;
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
    is_encrypted: boolean;
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

export interface SettingsTable {
    id: Generated<number>;
    is_auto_backup_enabled: number;
    max_backup_days: number;
}

export interface UserPasskeyTable {
    id: Generated<number>;
    name: string;
    user_id: number;
    webauthn_user_identifier: string;
    credential_identifier: string;
    public_key: Uint8Array;
    counter: number;
    is_backed_up: boolean;
    transports: string;
    created_at: number;
    last_used_at: number;
}

export interface BackupTargetTable {
    id: Generated<number>;
    name: string;
    type: string;
    settings: string;
    last_backup_at: number | null;
    created_at: number;
    updated_at: number;
    is_backup_in_progess?: boolean;
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
    user_passkey: UserPasskeyTable;
    periodic_task_schedule: PeriodicTaskScheduleTable;
    backup_target: BackupTargetTable;
}
