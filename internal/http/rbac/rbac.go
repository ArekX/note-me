package rbac

import "slices"

func Can(role Role, permission Permission) bool {
	definition, ok := roleDefinitions[role]

	if !ok {
		return false
	}

	return slices.Contains(definition.Permissions, permission)
}

func CanAccessSettings(role Role) bool {
	return slices.ContainsFunc(roleDefinitions[role].Permissions, func(p Permission) bool {
		return slices.Contains(settingsPermissions, p)
	})
}

func PermissionsFor(role Role) []Permission {
	return slices.Clone(roleDefinitions[role].Permissions)
}

// In the order of the frontend's roleNames, which zod's enum
// message lists.
var RoleNames = []Role{RoleAdmin, RoleUser}

func IsRole(role string) bool {
	_, ok := roleDefinitions[Role(role)]
	return ok
}
