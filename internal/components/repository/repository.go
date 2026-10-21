package repository

import "context"

type Repository interface {
	RunInTransaction(ctx context.Context, fn func(tx Repository) error) error

	AI() AI
	AuditLog() AuditLog
	BackupTargets() BackupTargets
	Files() Files
	Groups() Groups
	MCP() MCP
	Notes() Notes
	NoteHistory() NoteHistory
	Reminders() Reminders
	Search() Search
	Shares() Shares
	Notifications() Notifications
	Passkeys() Passkeys
	PeriodicTasks() PeriodicTasks
	Sessions() Sessions
	Tags() Tags
	Tree() Tree
	Users() Users
	UserManagement() UserManagement
}
