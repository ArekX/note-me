export interface PeriodicTaskInfo {
    name: string;
    schedule: string;
    description: string;
}

// Keyed by the task identifiers in internal/workers/periodictask/tasks.
export const periodicTasks: Record<string, PeriodicTaskInfo> = {
    "check-reminders": {
        name: "Check reminders",
        schedule: "Every minute",
        description:
            "Sends a notification for every note reminder that is due and schedules the next one for repeating reminders.",
    },
    "cleanup-temp-folder": {
        name: "Clean up temporary files",
        schedule: "Every hour",
        description:
            "Removes temporary files and unfinished uploads older than 6 hours.",
    },
    "remove-expired-share-links": {
        name: "Remove expired share links",
        schedule: "Daily at midnight (UTC)",
        description: "Deletes public share links whose expiry time has passed.",
    },
    "remove-expired-deleted-notes": {
        name: "Empty the recycle bin",
        schedule: "Daily at midnight (UTC)",
        description:
            "Permanently deletes notes that have been in the recycle bin for more than 30 days.",
    },
    "remove-expired-sessions": {
        name: "Remove expired sessions",
        schedule: "Every hour",
        description:
            "Deletes sign-in sessions that have expired, so they can no longer be used.",
    },
    "backup-database": {
        name: "Back up the database",
        schedule: "Daily at midnight (UTC)",
        description:
            "Creates an encrypted backup of the database on every backup target and removes the oldest automatic backups above the allowed count.",
    },
    "cleanup-audit-log": {
        name: "Clean up the audit log",
        schedule: "Daily at midnight (UTC)",
        description: "Deletes audit log entries older than one year.",
    },
    "remove-expired-mcp-tokens": {
        name: "Remove expired MCP tokens",
        schedule: "Every hour",
        description:
            "Deletes expired access and refresh tokens of MCP clients. Personal tokens do not expire.",
    },
};

export const periodicTaskInfo = (identifier: string): PeriodicTaskInfo =>
    periodicTasks[identifier] ?? {
        name: identifier,
        schedule: "",
        description: "",
    };
