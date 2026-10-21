package tasks

import (
	"log/slog"

	"noteme/internal/components"
	"noteme/internal/workers/periodictask"
)

const (
	CheckReminders            = "check-reminders"
	CleanupTempFolder         = "cleanup-temp-folder"
	RemoveExpiredShareLinks   = "remove-expired-share-links"
	RemoveExpiredDeletedNotes = "remove-expired-deleted-notes"
	RemoveExpiredSessions     = "remove-expired-sessions"
	BackupDatabase            = "backup-database"
	CleanupAuditLog           = "cleanup-audit-log"
	RemoveExpiredMCPTokens    = "remove-expired-mcp-tokens"
)

func Default(c *components.Components, log *slog.Logger) []periodictask.Task {
	return []periodictask.Task{
		checkReminders{c.Repository, log, c.Bus},
		cleanupTempFolder{c.Storage, c.Repository},
		removeExpiredShareLinks{c.Repository, c.Bus},
		removeExpiredDeletedNotes{c.Repository, log, c.Bus},
		removeExpiredSessions{c.Repository},
		backupDatabase{c.Backups, c.Bus},
		cleanupAuditLog{c.Repository},
		removeExpiredMCPTokens{c.Repository, log},
	}
}
