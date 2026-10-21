package rbac

type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

type roleDefinition struct {
	Name        string
	Permissions []Permission
}

var roleDefinitions = map[Role]roleDefinition{
	RoleAdmin: {
		Name: "Admin",
		Permissions: []Permission{
			CanUpdateUsers,
			CanReadTags,
			CanUpdateTags,
			CanManageAllFiles,
			CanViewPeriodicTasks,
			CanRunPeriodicTasks,
			CanManageBackups,
			CanViewAuditLog,
			CanViewServerLog,
			CanManageAiProviders,
		},
	},
	RoleUser: {
		Name:        "User",
		Permissions: []Permission{CanReadTags},
	},
}

var settingsPermissions = []Permission{
	CanUpdateUsers,
	CanManageBackups,
	CanUpdateTags,
	CanManageAllFiles,
	CanViewPeriodicTasks,
	CanViewAuditLog,
	CanViewServerLog,
	CanManageAiProviders,
}
