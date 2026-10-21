import type { FileKind } from "@/lib/file-kind";
import type { AppPermission, Role } from "@/lib/rbac";
import type {
    LocalBackupSettingsRequest,
    S3BackupSettingsRequest,
} from "@/schemas/settings";
import type { preferredEditors } from "@/schemas/users";

export interface RecordId {
    id: number;
}

export interface Paged<T> {
    results: T[];
    total: number;
    page: number;
    per_page: number;
}

export type UserId = RecordId;

export type PreferredEditor = (typeof preferredEditors)[number];

export interface UserOnboardingState {
    introduction_dismissed?: boolean;
    view_note_introduction_dismissed?: boolean;
    edit_note_introduction_dismissed?: boolean;
    backup_management_intro_dismissed?: boolean;
}

export interface UserRecord extends RecordId {
    name: string;
    username: string;
    timezone: string;
    role: Role;
    is_password_reset_required?: boolean;
    created_at: number;
    updated_at: number;
}

export interface UserLoginRecord extends UserRecord {
    onboarding_state: UserOnboardingState;
    preferred_editor: PreferredEditor;
    profile_picture: string | null;
}

export type UserStep = "password_reset";

export interface SessionResponse {
    user: UserLoginRecord;
    permissions: AppPermission[];
    required_steps: UserStep[];
}

export interface FindUserFilters {
    name?: string;
    username?: string;
    role?: Role | "";
}

export interface FindPickUserFilters {
    name?: string;
    username?: string;
    user_ids?: number[];
    exclude_user_ids?: number[];
}

export interface PickUserRecord extends RecordId {
    name: string;
    username: string;
}

export interface UserPasskeyRecord extends RecordId {
    name: string;
    last_used_at: number;
    created_at: number;
    transports: string;
}

export const mcpClientKinds = ["token", "oauth"] as const;
export type McpClientKind = (typeof mcpClientKinds)[number];

// The token and the client secret are only in the create and regenerate
// responses.
export interface McpClientRecord extends RecordId {
    name: string;
    kind: McpClientKind;
    client_id: string | null;
    token_prefix: string | null;
    redirect_uris: string[];
    is_read_only: boolean;
    created_at: number;
    last_used_at: number | null;
}

export type RegistrationResult =
    { success: true } | { success: false; fail_reason: string };

export interface NoteRecord extends RecordId {
    title: string;
    note: string;
    is_encrypted: boolean;
    is_wide: boolean;
    user_id: number;
    created_at: number;
    updated_at: number;
    last_open_at: number | null;
    is_deleted?: boolean;
    deleted_at?: number | null;
}

export interface ViewNoteRecord extends RecordId {
    title: string;
    note: string;
    is_encrypted: boolean;
    is_wide: boolean;
    group_id: number | null;
    group_name: string | null;
    tags: string[];
    updated_at: number;
}

export interface NoteDetailsRecord {
    group_id: number | null;
    group_name: string | null;
    created_at: number;
    updated_at: number;
    user_name: string;
    is_encrypted: boolean;
    note: string;
    title: string;
    is_deleted: boolean;
}

export interface NoteDetailsOptions {
    include_group?: boolean;
    include_timestamp?: boolean;
    include_user?: boolean;
    include_title?: boolean;
    include_note?: boolean;
    // The owner's notes in the recycle bin too.
    include_deleted?: boolean;
}

export interface NoteInfoRecord extends RecordId {
    title: string;
    is_encrypted: boolean;
    user_name: string;
    user_id: number;
}

export interface RecentNoteRecord extends RecordId {
    title: string;
    group_id: number | null;
    group_name: string | null;
    updated_at: number;
    last_open_at: number | null;
    is_encrypted: boolean;
}

export interface DeletedNoteRecord extends RecordId {
    title: string;
    is_encrypted: boolean;
    deleted_at?: number | null;
}

export interface DeletedNotesFilter {
    fromId?: number;
}

export interface NoteHistoryMetaRecord extends RecordId {
    version: string;
    created_at: number;
    is_encrypted: boolean;
}

export interface NoteHistoryDataRecord {
    version: string;
    note: string;
    title: string;
    is_encrypted: boolean;
    tags: string;
}

export interface SetReminderResult {
    next_at: number;
    interval?: number | null;
    unit_value?: number | null;
    repeat_count: number;
}

export interface ReminderNoteRecord extends RecordId {
    note_id: number;
    done_count: number;
    interval?: number | null;
    unit_value?: number | null;
    repeat_count: number;
    next_at: number;
    title: string;
    is_encrypted: boolean;
    author_id: number;
    author_name: string;
    type: "once" | "repeat";
}

export interface UserReminderNotesFilters {
    fromNextAt?: number;
    fromId?: number;
    limit?: number;
}

export interface NoteReminderData extends RecordId {
    next_at: number;
    interval?: number | null;
    unit_value?: number | null;
    repeat_count: number;
    done_count: number;
}

export type SearchType = "general" | "shared" | "reminders" | "recycleBin";

export interface SearchNoteFilters {
    from_id?: number;
    query: string;
    group_id?: number;
    tags?: string[];
    type: SearchType;
}

export interface NoteSearchRecord extends RecordId {
    title: string;
    note: string;
    group_name: string | null;
    is_encrypted: boolean;
    updated_at: number;
    user_name: string;
}

export type NoteSearchResult =
    | NoteSearchRecord
    | ReminderNoteRecord
    | UserSharedNoteMeta
    | DeletedNoteRecord;

export interface PublicNoteShareRecord extends RecordId {
    note_id: number;
    identifier: string;
    created_at: number;
    expires_at: number | null;
}

export interface PublicSharedNote extends RecordId {
    title: string;
    note: string;
    is_encrypted: boolean;
    is_wide: boolean;
    tags: string[];
    updated_at: number;
    user_name: string;
}

export interface NoteShareData {
    users: PickUserRecord[];
    links: PublicNoteShareRecord[];
}

export interface UserSharedNoteMeta extends RecordId {
    share_id: number;
    title: string;
    is_encrypted: boolean;
    user_name: string;
    created_at: number;
}

export interface FindUserSharedNotesFilters {
    fromCreatedAt?: number;
    fromShareId?: number;
    limit?: number;
}

export interface TagRecord extends RecordId {
    name: string;
}

export interface FindTagFilters {
    name: string;
}

export interface GroupRecord extends RecordId {
    name: string;
    parent_id: number | null;
    created_at: number;
    has_subgroups: number | null;
    has_notes: number | null;
}

export type ItemType = "note" | "group";

export interface TreeRecord {
    type: ItemType;
    id: number;
    name: string;
    is_encrypted: number;
    has_children: number;
}

export interface FileMetaRecord {
    identifier: string;
    name: string;
    mime_type: string;
    size: number;
    is_public: boolean;
    created_at: number;
    created_by: string;
}

export interface FindFileFilters {
    name?: string;
    allFiles?: boolean;
    owner?: string;
    kind?: FileKind;
    visibility?: "public" | "private";
}

export interface NotificationNoteReminderData {
    id: number;
    reminder_id: number;
    title: string;
    is_encrypted: boolean;
    user_id: number;
    user_name: string;
    type: "own" | "shared";
}

export interface NoteSharedData {
    id: number;
    title: string;
    user_name: string;
}

export type NotificationDataTypes =
    | { type: "reminder-received"; payload: NotificationNoteReminderData }
    | { type: "note-shared"; payload: NoteSharedData };

export interface NotificationRecord extends RecordId {
    data: NotificationDataTypes;
    created_at: number;
    is_read: boolean;
    user_id: number;
}

export interface AuditLogFilters {
    event?: string;
    username?: string;
    from?: number;
    to?: number;
}

export interface AuditLogRecord {
    id: number;
    created_at: number;
    event: string;
    user_id: number | null;
    username: string | null;
    address: string | null;
    details: Record<string, unknown>;
}

export interface PeriodicTaskRecord {
    task_identifier: string;
    next_run_at: number;
    last_successful_run_at: number | null;
    last_fail_reason: string | null;
    last_fail_run_at: number | null;
    // null until the first run.
    is_last_run_successful: boolean | null;
}

export type PeriodicTaskRunOutcome = "" | "success" | "failed";

export interface PeriodicTaskRunRecord extends RecordId {
    task_identifier: string;
    ran_at: number;
    duration_ms: number;
    is_successful: boolean;
    fail_reason: string | null;
}

interface BackupTargetBase extends RecordId {
    name: string;
    created_at: number;
    updated_at: number;
    last_backup_at: number | null;
}

export type BackupTargetRecord =
    | (BackupTargetBase & {
          type: "local";
          settings: LocalBackupSettingsRequest;
      })
    | (BackupTargetBase & { type: "s3"; settings: S3BackupSettingsRequest });

export type BackupTargetType = BackupTargetRecord["type"];

export type BackupIdentifier = string;

export interface BackupItem {
    identifier: BackupIdentifier;
    name: string;
    created_at: number;
    size: number;
}

export const aiProviderTypes = ["ollama", "openai", "claude"] as const;
export type AiProviderType = (typeof aiProviderTypes)[number];

// The API key itself never reaches the browser.
export interface AiProviderRecord extends RecordId {
    name: string;
    type: AiProviderType;
    base_url: string;
    model: string;
    is_default: boolean;
    has_key: boolean;
    key_unreadable: boolean;
    created_at: number;
    updated_at: number;
}

export type AiAccess = "default" | "none" | "provider";

export interface AiUserAccessRecord {
    user_id: number;
    access: AiAccess;
    provider_id: number | null;
}

export interface AiConversationRecord extends RecordId {
    title: string;
    created_at: number;
    updated_at: number;
}

export interface AiToolCall {
    id: string;
    name: string;
    arguments: unknown;
}

export type AiToolStatus = "done" | "failed" | "declined";

export interface AiMessageRecord extends RecordId {
    role: "user" | "assistant" | "tool";
    content: string;
    tool_calls: AiToolCall[] | null;
    tool_call_id: string | null;
    tool_name: string | null;
    tool_status: AiToolStatus | null;
    created_at: number;
}

export type AiProtectedPolicy = "" | "read" | "write" | "protection";

export interface AiToolInfo {
    name: string;
    title: string;
    description: string;
    confirm: boolean;
    protected: AiProtectedPolicy;
    browser: boolean;
}

export interface AiToolMessage {
    namespace: string;
    type: string;
    expect: string;
    payload: Record<string, unknown>;
    timeout_ms?: number;
}

export interface AiToolCallRequest extends AiToolCall {
    title: string;
    confirm: boolean;
    protected: AiProtectedPolicy;
    browser: boolean;
    message: AiToolMessage | null;
}

export interface AiOpenPage {
    name: string;
    note_id: number | null;
}

export interface AiToolResult {
    id: string;
    status: AiToolStatus;
    content: string;
    protected?: boolean;
}
