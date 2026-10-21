import type {
    AiConversationRecord,
    AiMessageRecord,
    AiProviderRecord,
    AiToolInfo,
    AiToolResult,
    AiUserAccessRecord,
    AuditLogRecord,
    BackupItem,
    BackupTargetRecord,
    FileMetaRecord,
    GroupRecord,
    NoteHistoryDataRecord,
    NoteHistoryMetaRecord,
    NoteReminderData,
    NotificationRecord,
    PeriodicTaskRecord,
    PeriodicTaskRunRecord,
    PublicNoteShareRecord,
    TagRecord,
    UserLoginRecord,
    UserPasskeyRecord,
    UserRecord,
} from "@/types/records";
import { mockMcpClients } from "./mcp-fixture";
import { mockNotes } from "./notes-fixture";

export interface MockNote {
    id: number;
    title: string;
    note: string;
    is_encrypted: boolean;
    // Absent means wide, the default of the column.
    is_wide?: boolean;
    user_id: number;
    group_id: number | null;
    tags: string[];
    created_at: number;
    updated_at: number;
    last_open_at: number | null;
    is_deleted: boolean;
    deleted_at: number | null;
}

export interface MockHistory
    extends NoteHistoryMetaRecord, NoteHistoryDataRecord {
    note_id: number;
}

export interface MockReminder extends NoteReminderData {
    note_id: number;
    user_id: number;
}

export interface MockUserShare {
    id: number;
    note_id: number;
    user_id: number;
    created_at: number;
}

export interface MockAiState {
    access: { enabled: boolean };
    providers: AiProviderRecord[];
    userAccess: AiUserAccessRecord[];
    conversations: AiConversationRecord[];
    messages: Map<number, AiMessageRecord[]>;
    lockedConversations: Set<number>;
    tools: AiToolInfo[];
    // Every submitToolResults, for the tests to check.
    submitted: AiToolResult[][];
}

export interface MockState {
    currentUser: UserLoginRecord;
    ai: MockAiState;
    users: UserRecord[];
    notes: MockNote[];
    groups: GroupRecord[];
    tags: TagRecord[];
    files: FileMetaRecord[];
    uploads: Map<
        string,
        { name: string; mime_type: string; size: number; chunks: Uint8Array[] }
    >;
    notifications: NotificationRecord[];
    history: MockHistory[];
    reminders: MockReminder[];
    userShares: MockUserShare[];
    linkShares: PublicNoteShareRecord[];
    passkeys: UserPasskeyRecord[];
    // Milliseconds; the server keeps this per session.
    passkeyPasswordConfirmedUntil: number;
    mcpClients: ReturnType<typeof mockMcpClients>;
    backupTargets: BackupTargetRecord[];
    backups: Map<number, BackupItem[]>;
    periodicTasks: PeriodicTaskRecord[];
    periodicTaskRuns: PeriodicTaskRunRecord[];
    auditLog: AuditLogRecord[];
    serverLog: string[];
    nextId: number;
}

export const now = (): number => Math.floor(Date.now() / 1000);

// Backup names as the server makes them: <kind>-<UTC time>.zip.enc.
export const zipName = (kind: string, unix: number): string =>
    `${kind}-${new Date(unix * 1000).toISOString().slice(0, 19).replace(/[T:]/g, "-")}.zip.enc`;

export const day = 24 * 60 * 60;

const backup = (kind: string, at: number, size: number): BackupItem => ({
    identifier: zipName(kind, at),
    name: zipName(kind, at),
    created_at: at,
    size,
});

// 23 entries, newest first, so the list pages twice.
const auditLog = (t: number): AuditLogRecord[] => [
    {
        id: 1023,
        created_at: t - 60,
        event: "login_failed",
        user_id: null,
        username: "mallory",
        address: "203.0.113.7",
        details: { reason: "unknown user" },
    },
    {
        id: 1022,
        created_at: t - 3600,
        event: "login_locked",
        user_id: 2,
        username: "jane",
        address: "198.51.100.4",
        details: { attempts: 5, until: t - 3000 },
    },
    {
        id: 1021,
        created_at: t - 2 * 3600,
        event: "password_changed",
        user_id: 1,
        username: "admin",
        address: "127.0.0.1",
        details: {},
    },
    ...Array.from({ length: 20 }, (_, i) => ({
        id: 1020 - i,
        created_at: t - (i + 1) * day,
        event: "login",
        user_id: 1,
        username: "admin",
        address: "127.0.0.1",
        details: { method: i % 2 === 0 ? "password" : "passkey" },
    })),
];

const task = (
    identifier: string,
    nextRunAt: number,
    lastSuccessAt: number | null,
): PeriodicTaskRecord => ({
    task_identifier: identifier,
    next_run_at: nextRunAt,
    last_successful_run_at: lastSuccessAt,
    is_last_run_successful: true,
    last_fail_reason: null,
    last_fail_run_at: null,
});

export const createMockState = (): MockState => {
    const t = now();
    const nextMinute = Math.floor(t / 60) * 60 + 60;
    const nextHour = Math.floor(t / 3600) * 3600 + 3600;
    const nextMidnight = Math.floor(t / day) * day + day;

    const currentUser: UserLoginRecord = {
        id: 1,
        name: "Administrator",
        username: "admin",
        timezone: "Europe/Belgrade",
        role: "admin",
        is_password_reset_required: false,
        created_at: t - 90 * day,
        updated_at: t - 2 * day,
        onboarding_state: { introduction_dismissed: true },
        preferred_editor: "rich",
        profile_picture: null,
    };

    const users: UserRecord[] = [
        currentUser,
        {
            id: 2,
            name: "Jane Doe",
            username: "jane",
            timezone: "Europe/London",
            role: "user",
            created_at: t - 60 * day,
            updated_at: t - 10 * day,
        },
        {
            id: 3,
            name: "Marko Marković",
            username: "marko",
            timezone: "Europe/Belgrade",
            role: "user",
            created_at: t - 30 * day,
            updated_at: t - day,
        },
    ];

    const groups: GroupRecord[] = [
        {
            id: 1,
            name: "Work",
            parent_id: null,
            created_at: t - 80 * day,
            has_subgroups: 1,
            has_notes: 1,
        },
        {
            id: 2,
            name: "Projects",
            parent_id: 1,
            created_at: t - 70 * day,
            has_subgroups: null,
            has_notes: 1,
        },
        {
            id: 3,
            name: "Meetings",
            parent_id: 1,
            created_at: t - 65 * day,
            has_subgroups: null,
            has_notes: 1,
        },
        {
            id: 4,
            name: "Personal",
            parent_id: null,
            created_at: t - 50 * day,
            has_subgroups: null,
            has_notes: 1,
        },
        {
            id: 5,
            name: "Recipes",
            parent_id: null,
            created_at: t - 20 * day,
            has_subgroups: null,
            has_notes: null,
        },
    ];

    const tags: TagRecord[] = [
        { id: 1, name: "todo" },
        { id: 2, name: "idea" },
        { id: 3, name: "go" },
        { id: 4, name: "vue" },
        { id: 5, name: "reading" },
    ];

    const notes = mockNotes(t);

    return {
        currentUser,
        ai: {
            access: { enabled: false },
            providers: [],
            userAccess: [],
            conversations: [],
            messages: new Map(),
            lockedConversations: new Set(),
            tools: [
                {
                    name: "get_tree",
                    title: "List folder",
                    description: "Lists a folder.",
                    confirm: false,
                    protected: "",
                    browser: false,
                },
                {
                    name: "get_note",
                    title: "Read note",
                    description: "Reads a note.",
                    confirm: false,
                    protected: "read",
                    browser: false,
                },
            ],
            submitted: [],
        },
        users,
        notes,
        groups,
        tags,
        files: [
            {
                identifier: "mock-file-1",
                name: "architecture.png",
                mime_type: "image/png",
                size: 184_322,
                is_public: true,
                created_at: t - 10 * day,
                created_by: "Administrator",
            },
            {
                identifier: "mock-file-2",
                name: "notes-export.zip",
                mime_type: "application/zip",
                size: 2_048_000,
                is_public: false,
                created_at: t - 2 * day,
                created_by: "Administrator",
            },
        ],
        uploads: new Map(),
        notifications: [
            {
                id: 1,
                user_id: 1,
                created_at: t - 3600,
                is_read: false,
                data: {
                    type: "note-shared",
                    payload: {
                        id: 7,
                        title: "Jane's deployment checklist",
                        user_name: "Jane Doe",
                    },
                },
            },
            {
                id: 2,
                user_id: 1,
                created_at: t - day,
                is_read: true,
                data: {
                    type: "reminder-received",
                    payload: {
                        id: 2,
                        reminder_id: 1,
                        title: "Weekly sync 2026-10-06",
                        is_encrypted: false,
                        user_id: 1,
                        user_name: "Administrator",
                        type: "own",
                    },
                },
            },
        ],
        history: [
            {
                id: 1,
                note_id: 1,
                version: "Version 1",
                created_at: t - 20 * day,
                is_encrypted: false,
                title: "NoteMe Go rewrite plan",
                note: "# NoteMe Go rewrite plan\n\n- [ ] Scaffold backend and frontend",
                tags: "todo",
            },
            {
                id: 2,
                note_id: 1,
                version: "Version 2",
                created_at: t - 3600,
                is_encrypted: false,
                title: "NoteMe Go rewrite plan",
                note: notes[0]!.note,
                tags: "todo,go,vue",
            },
        ],
        reminders: [
            {
                id: 1,
                note_id: 2,
                user_id: 1,
                next_at: t + 7 * day,
                interval: 7,
                unit_value: day,
                repeat_count: 10,
                done_count: 1,
            },
            {
                id: 2,
                note_id: 1,
                user_id: 1,
                next_at: t + 3600,
                interval: null,
                unit_value: null,
                repeat_count: 0,
                done_count: 0,
            },
        ],
        userShares: [{ id: 1, note_id: 7, user_id: 1, created_at: t - 3600 }],
        linkShares: [
            {
                id: 1,
                note_id: 3,
                identifier: "mock-public-share",
                created_at: t - 5 * day,
                expires_at: t + 25 * day,
            },
        ],
        passkeys: [
            {
                id: 1,
                name: "Platform authenticator (built-in into OS)",
                transports: "internal",
                created_at: t - 40 * day,
                last_used_at: t - day,
            },
        ],
        passkeyPasswordConfirmedUntil: 0,
        mcpClients: mockMcpClients(t),
        backupTargets: [
            {
                id: 1,
                name: "Local backups",
                type: "local",
                settings: { location: "/app/backup" },
                created_at: t - 60 * day,
                updated_at: t - 60 * day,
                last_backup_at: nextMidnight - day,
            },
            {
                id: 2,
                name: "S3 offsite",
                type: "s3",
                settings: {
                    bucket: "noteme-backups",
                    region: "eu-central-1",
                    prefix: "prod",
                    credentials: { type: "iam_role" },
                },
                created_at: t - 30 * day,
                updated_at: t - 30 * day,
                last_backup_at: null,
            },
        ],
        backups: new Map([
            [
                1,
                [
                    backup("automatic", nextMidnight - day, 14_098_432),
                    backup("automatic", nextMidnight - 2 * day, 14_001_152),
                    backup("manual", t - 2 * day - 3 * 3600, 13_950_976),
                ],
            ],
            [2, []],
        ]),
        // Order and schedules of the server's periodic tasks.
        periodicTasks: [
            task("check-reminders", nextMinute, nextMinute - 60),
            task("cleanup-temp-folder", nextHour, nextHour - 3600),
            task(
                "remove-expired-share-links",
                nextMidnight,
                nextMidnight - day,
            ),
            {
                ...task("remove-expired-deleted-notes", nextMidnight, null),
                is_last_run_successful: null,
            },
            task("remove-expired-sessions", nextHour, nextHour - 3600),
            {
                ...task(
                    "backup-database",
                    nextMidnight,
                    nextMidnight - 2 * day,
                ),
                is_last_run_successful: false,
                last_fail_reason: "S3 offsite: AccessDenied",
                last_fail_run_at: nextMidnight - day,
            },
            task("remove-expired-mcp-tokens", nextHour, nextHour - 3600),
        ],
        // 25 backup runs, newest first, the second one failed.
        periodicTaskRuns: Array.from({ length: 25 }, (_, index) => ({
            id: 500 - index,
            task_identifier: "backup-database",
            ran_at: nextMidnight - (index + 1) * day,
            duration_ms: 1200 + index * 10,
            is_successful: index !== 1,
            fail_reason: index === 1 ? "S3 offsite: AccessDenied" : null,
        })),
        auditLog: auditLog(t),
        serverLog: [
            "\x1b[32m 2026-10-21 08:00:00 INFO  server started\x1b[0m addr=:8000",
            "\x1b[32m 2026-10-21 08:00:01 INFO  migrations up to date\x1b[0m",
            "\x1b[33m 2026-10-21 08:05:12 WARN  login failed\x1b[0m username=mallory",
        ],
        nextId: 100,
    };
};
