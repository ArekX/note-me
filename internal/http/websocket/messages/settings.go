package messages

import "encoding/json"

const (
	SettingsGetPeriodicTasks    = "getPeriodicTasks"
	SettingsGetPeriodicTaskRuns = "getPeriodicTaskRuns"
	SettingsRunPeriodicTask     = "runPeriodicTask"
	SettingsGetBackupTargets    = "getBackupTargets"
	SettingsCreateBackupTarget  = "createBackupTarget"
	SettingsUpdateBackupTarget  = "updateBackupTarget"
	SettingsDeleteBackupTarget  = "deleteBackupTarget"
	SettingsGetBackups          = "getBackups"
	SettingsCreateBackupNow     = "createBackupNow"
	SettingsDeleteBackup        = "deleteBackup"
	SettingsGetAuditLog         = "getAuditLog"
	SettingsGetServerLog        = "getServerLog"

	SettingsGetPeriodicTasksResponse    = "getPeriodicTasksResponse"
	SettingsGetPeriodicTaskRunsResponse = "getPeriodicTaskRunsResponse"
	SettingsRunPeriodicTaskResponse     = "runPeriodicTaskResponse"
	SettingsGetBackupTargetsResponse    = "getBackupTargetsResponse"
	SettingsCreateBackupTargetResponse  = "createBackupTargetResponse"
	SettingsUpdateBackupTargetResponse  = "updateBackupTargetResponse"
	SettingsDeleteBackupTargetResponse  = "deleteBackupTargetResponse"
	SettingsGetBackupsResponse          = "getBackupsResponse"
	SettingsCreateBackupNowResponse     = "createBackupNowResponse"
	SettingsDeleteBackupResponse        = "deleteBackupResponse"
	SettingsGetAuditLogResponse         = "getAuditLogResponse"
	SettingsGetServerLogResponse        = "getServerLogResponse"
)

type GetPeriodicTasks struct{ Header }

type GetPeriodicTasksResponse struct {
	Header
	Tasks []PeriodicTaskRecord `json:"tasks"`
}

// Not in the original. Outcome is "", "success" or "failed".
type GetPeriodicTaskRuns struct {
	Header
	TaskIdentifier string `json:"task_identifier"`
	Outcome        string `json:"outcome,omitempty"`
	Page           int    `json:"page"`
}

// HistoryDays is PERIODIC_TASK_HISTORY_DAYS; older runs are removed.
type GetPeriodicTaskRunsResponse struct {
	Header
	Runs        Paged[PeriodicTaskRunRecord] `json:"runs"`
	HistoryDays int                          `json:"history_days"`
}

// Not in the original.
type RunPeriodicTask struct {
	Header
	TaskIdentifier string `json:"task_identifier"`
}

type RunPeriodicTaskResponse struct {
	Header
	TaskIdentifier string `json:"task_identifier"`
	NextRunAt      int64  `json:"next_run_at"`
}

type GetBackupTargets struct{ Header }

// Not in the original, which passed MAX_ALLOWED_BACKUP_COUNT to the page.
type GetBackupTargetsResponse struct {
	Header
	Targets        []BackupTargetRecord `json:"targets"`
	MaxBackupCount int                  `json:"max_backup_count"`
}

type CreateBackupTarget struct {
	Header
	Target json.RawMessage `json:"target"`
}

type CreateBackupTargetResponse struct {
	Header
	Record BackupTargetRecord `json:"record"`
}

type UpdateBackupTarget struct {
	Header
	TargetID int64           `json:"target_id"`
	Data     json.RawMessage `json:"data"`
}

type UpdateBackupTargetResponse struct {
	Header
	TargetID int64               `json:"target_id"`
	Data     BackupTargetRequest `json:"data"`
}

type DeleteBackupTarget struct {
	Header
	TargetID int64 `json:"target_id"`
}

type DeleteBackupTargetResponse struct {
	Header
	TargetID int64 `json:"target_id"`
}

type GetBackups struct {
	Header
	TargetID int64 `json:"target_id"`
}

type GetBackupsResponse struct {
	Header
	Backups []BackupItem `json:"backups"`
}

type CreateBackupNow struct {
	Header
	TargetID int64 `json:"target_id"`
}

type CreateBackupNowResult struct {
	Success  bool        `json:"success"`
	TargetID int64       `json:"target_id,omitempty"`
	Backup   *BackupItem `json:"backup,omitempty"`
	Message  string      `json:"message,omitempty"`
}

type CreateBackupNowResponse struct {
	Header
	Result CreateBackupNowResult `json:"result"`
}

type DeleteBackup struct {
	Header
	TargetID   int64  `json:"target_id"`
	Identifier string `json:"identifier"`
}

type DeleteBackupResponse struct {
	Header
	TargetID   int64  `json:"target_id"`
	Identifier string `json:"identifier"`
}

// Not in the original (SF-49).
type GetAuditLog struct {
	Header
	Filters AuditLogFilters `json:"filters"`
	Page    int             `json:"page"`
}

// Events fills the filter dropdown.
type GetAuditLogResponse struct {
	Header
	Records Paged[AuditLogRecord] `json:"records"`
	Events  []string              `json:"events"`
}

type GetServerLog struct{ Header }

// Oldest line first.
type GetServerLogResponse struct {
	Header
	Lines []string `json:"lines"`
}
