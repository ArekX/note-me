package audit

import (
	"context"
	"encoding/json"
	"log/slog"

	"noteme/internal/components/repository"
)

// Event names are stored in audit_log.event and shown in the admin UI.
const (
	LoginSucceeded           = "login_succeeded"
	LoginFailed              = "login_failed"
	LoginLocked              = "login_locked"
	PasskeyLoginSucceeded    = "passkey_login_succeeded"
	PasskeyLoginFailed       = "passkey_login_failed"
	Logout                   = "logout"
	PasswordChanged          = "password_changed"
	PasswordAttemptsLocked   = "password_attempts_locked"
	PasskeyRegistered        = "passkey_registered"
	PasskeyDeleted           = "passkey_deleted"
	UserCreated              = "user_created"
	UserUpdated              = "user_updated"
	UserDeleted              = "user_deleted"
	BackupTargetCreated      = "backup_target_created"
	BackupTargetUpdated      = "backup_target_updated"
	BackupTargetDeleted      = "backup_target_deleted"
	BackupCreated            = "backup_created"
	BackupDeleted            = "backup_deleted"
	BackupDownloaded         = "backup_downloaded"
	TagUpdated               = "tag_updated"
	TagDeleted               = "tag_deleted"
	FileVisibilityChangedBy  = "file_visibility_changed_by_admin"
	FileDeletedByAdmin       = "file_deleted_by_admin"
	AIProviderCreated        = "ai_provider_created"
	AIProviderUpdated        = "ai_provider_updated"
	AIProviderDeleted        = "ai_provider_deleted"
	AIDefaultChanged         = "ai_default_provider_changed"
	AIAccessChanged          = "ai_access_changed"
	PeriodicTaskRunRequested = "periodic_task_run_requested"
	MCPClientCreated         = "mcp_client_created"
	MCPClientUpdated         = "mcp_client_updated"
	MCPClientDeleted         = "mcp_client_deleted"
	MCPClientSecretRenewed   = "mcp_client_secret_regenerated"
	MCPConsentGiven          = "mcp_consent_given"
	MCPTokenRefused          = "mcp_token_refused"
	MCPClientAuthFailed      = "mcp_client_auth_failed"
	MCPRefreshTokenReused    = "mcp_refresh_token_reused"
)

// Who did it; Username is kept as text so the entry outlives the account.
type Actor struct {
	UserID   int
	Username string
	Address  string
}

type Log struct {
	repo repository.Repository
	log  *slog.Logger
}

func New(repo repository.Repository, log *slog.Logger) *Log {
	return &Log{repo: repo, log: log}
}

// details is encoded as JSON; a failed write is logged, never returned, so
// auditing cannot break the action it records.
func (l *Log) Record(ctx context.Context, event string, actor Actor, details map[string]any) {
	if details == nil {
		details = map[string]any{}
	}
	encoded, err := json.Marshal(details)
	if err != nil {
		l.log.Error("Could not encode audit details", "event", event, "error", err)
		return
	}
	entry := repository.AuditEntry{Event: event, Username: actor.Username, Address: actor.Address, Details: string(encoded)}
	if actor.UserID != 0 {
		id := actor.UserID
		entry.UserId = &id
	}
	if err := l.repo.AuditLog().CreateAuditEntry(ctx, entry); err != nil {
		l.log.Error("Could not write the audit log", "event", event, "error", err)
	}
}
