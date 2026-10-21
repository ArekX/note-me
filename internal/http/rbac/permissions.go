package rbac

type Permission string

const (
	CanUpdateUsers       Permission = "canUpdateUsers"
	CanReadTags          Permission = "canReadTags"
	CanUpdateTags        Permission = "canUpdateTags"
	CanManageBackups     Permission = "canManageBackups"
	CanManageAllFiles    Permission = "canManageAllFiles"
	CanViewPeriodicTasks Permission = "canViewPeriodicTasks"
	CanRunPeriodicTasks  Permission = "canRunPeriodicTasks"
	CanViewAuditLog      Permission = "canViewAuditLog"
	CanViewServerLog     Permission = "canViewServerLog"
	CanManageAiProviders Permission = "canManageAiProviders"
)
