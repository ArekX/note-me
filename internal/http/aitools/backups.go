package aitools

import (
	"encoding/json"

	"noteme/internal/http/rbac"
	"noteme/internal/http/websocket/messages"
)

// Manual backups can take minutes and answer when they are done.
const backupTimeoutMs = 30 * 60 * 1000

const backupSettingsHelp = ` Settings for local: {"location": "<folder inside the backup root>"}; for s3: {"bucket", "region", "prefix", "credentials": {"type": "iam_role"} or {"type": "access_key", "access_key_id", "secret_access_key"}}.`

type backupTargetArgs struct {
	Name     string          `json:"name"`
	Type     string          `json:"type" enum:"local,s3"`
	Settings json.RawMessage `json:"settings" desc:"Settings of the type"`
}

type updateBackupTargetArgs struct {
	ID       int64           `json:"id" desc:"Backup target id"`
	Name     string          `json:"name"`
	Type     string          `json:"type" enum:"local,s3"`
	Settings json.RawMessage `json:"settings" desc:"Settings of the type; a masked secret keeps the stored one"`
}

type backupTargetID struct {
	ID int64 `json:"id" desc:"Backup target id"`
}

type targetIDArgs struct {
	TargetID int64 `json:"target_id" desc:"Backup target id"`
}

type deleteBackupArgs struct {
	TargetID   int64  `json:"target_id" desc:"Backup target id"`
	Identifier string `json:"identifier" desc:"Backup identifier from get_backups"`
}

var backupTools = []Tool{
	define(Tool{
		Name:        "get_backup_targets",
		Title:       "Backup targets",
		Description: "Lists the places backups are stored and how many automatic backups each keeps.",
		ReadOnly:    true,
		Permission:  rbac.CanManageBackups,
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceSettings, messages.SettingsGetBackupTargets, messages.SettingsGetBackupTargetsResponse, map[string]any{})
	}),
	define(Tool{
		Name:        "create_backup_target",
		Title:       "Create backup target",
		Description: "Adds a place to store backups." + backupSettingsHelp,
		Permission:  rbac.CanManageBackups,
		Confirm:     true,
	}, func(_ Env, args backupTargetArgs) (*Call, error) {
		return message(messages.NamespaceSettings, messages.SettingsCreateBackupTarget, messages.SettingsCreateBackupTargetResponse,
			map[string]any{"target": map[string]any{"name": args.Name, "type": args.Type, "settings": args.Settings}})
	}),
	define(Tool{
		Name:        "update_backup_target",
		Title:       "Update backup target",
		Description: "Changes a backup target." + backupSettingsHelp,
		Permission:  rbac.CanManageBackups,
		Confirm:     true,
	}, func(_ Env, args updateBackupTargetArgs) (*Call, error) {
		return message(messages.NamespaceSettings, messages.SettingsUpdateBackupTarget, messages.SettingsUpdateBackupTargetResponse,
			map[string]any{"target_id": args.ID, "data": map[string]any{"name": args.Name, "type": args.Type, "settings": args.Settings}})
	}),
	define(Tool{
		Name:        "delete_backup_target",
		Title:       "Delete backup target",
		Description: "Removes a backup target; the backups stored there are kept.",
		Permission:  rbac.CanManageBackups,
		Confirm:     true,
	}, func(_ Env, args backupTargetID) (*Call, error) {
		return message(messages.NamespaceSettings, messages.SettingsDeleteBackupTarget, messages.SettingsDeleteBackupTargetResponse, map[string]any{"target_id": args.ID})
	}),
	define(Tool{
		Name:        "get_backups",
		Title:       "Backups",
		Description: "Lists the backups stored in a target.",
		ReadOnly:    true,
		Permission:  rbac.CanManageBackups,
	}, func(_ Env, args targetIDArgs) (*Call, error) {
		return message(messages.NamespaceSettings, messages.SettingsGetBackups, messages.SettingsGetBackupsResponse, map[string]any{"target_id": args.TargetID})
	}),
	define(Tool{
		Name:        "create_backup_now",
		Title:       "Back up now",
		Description: "Makes a manual backup of the database and files into a target; it can take minutes.",
		Permission:  rbac.CanManageBackups,
		Confirm:     true,
	}, func(_ Env, args targetIDArgs) (*Call, error) {
		call, err := message(messages.NamespaceSettings, messages.SettingsCreateBackupNow, messages.SettingsCreateBackupNowResponse, map[string]any{"target_id": args.TargetID})
		call.TimeoutMs = backupTimeoutMs
		return call, err
	}),
	define(Tool{
		Name:        "delete_backup",
		Title:       "Delete backup",
		Description: "Deletes a stored backup for good.",
		Permission:  rbac.CanManageBackups,
		Confirm:     true,
	}, func(_ Env, args deleteBackupArgs) (*Call, error) {
		return message(messages.NamespaceSettings, messages.SettingsDeleteBackup, messages.SettingsDeleteBackupResponse, map[string]any{"target_id": args.TargetID, "identifier": args.Identifier})
	}),
}
