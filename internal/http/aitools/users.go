package aitools

import (
	"noteme/internal/http/rbac"
	"noteme/internal/http/websocket/messages"
)

type findUsersArgs struct {
	Name     string `json:"name,omitempty" desc:"Part of the name"`
	Username string `json:"username,omitempty" desc:"Part of the username"`
	Role     string `json:"role,omitempty" enum:"admin,user"`
	Page     int    `json:"page,omitempty" desc:"Page of 20 users, from 1"`
}

type createUserArgs struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Password string `json:"password" desc:"Initial password, at least 8 characters; the user changes it at the first sign in"`
	Role     string `json:"role" enum:"admin,user"`
	Timezone string `json:"timezone" desc:"IANA time zone, for example Europe/Berlin"`
}

// No password: a password reset stays in the users area.
type updateUserArgs struct {
	ID       int64  `json:"id" desc:"User id"`
	Name     string `json:"name"`
	Role     string `json:"role" enum:"admin,user"`
	Timezone string `json:"timezone" desc:"IANA time zone"`
}

type userID struct {
	ID int64 `json:"id" desc:"User id"`
}

var userTools = []Tool{
	define(Tool{
		Name:        "find_users",
		Title:       "Find users",
		Description: "Lists the users of this NoteMe server.",
		ReadOnly:    true,
		Permission:  rbac.CanUpdateUsers,
	}, func(_ Env, args findUsersArgs) (*Call, error) {
		filters := map[string]any{}
		for key, value := range map[string]string{"name": args.Name, "username": args.Username, "role": args.Role} {
			if value != "" {
				filters[key] = value
			}
		}
		return message(messages.NamespaceUsers, messages.UsersFind, messages.UsersFindResponse, map[string]any{"filters": filters, "page": max(args.Page, 1)})
	}),
	define(Tool{
		Name:        "create_user",
		Title:       "Create user",
		Description: "Creates a user, who must change the password at the first sign in.",
		Permission:  rbac.CanUpdateUsers,
		Confirm:     true,
	}, func(_ Env, args createUserArgs) (*Call, error) {
		return message(messages.NamespaceUsers, messages.UsersCreate, messages.UsersCreateResponse, map[string]any{"data": map[string]any{
			"name": args.Name, "username": args.Username, "password": args.Password, "role": args.Role, "timezone": args.Timezone,
		}})
	}),
	define(Tool{
		Name:        "update_user",
		Title:       "Update user",
		Description: "Changes a user's name, role or time zone; pass the current values for the fields that stay.",
		Permission:  rbac.CanUpdateUsers,
		Confirm:     true,
	}, func(_ Env, args updateUserArgs) (*Call, error) {
		return message(messages.NamespaceUsers, messages.UsersUpdate, messages.UsersUpdateResponse, map[string]any{"id": args.ID, "data": map[string]any{
			"name": args.Name, "role": args.Role, "timezone": args.Timezone,
		}})
	}),
	define(Tool{
		Name:        "delete_user",
		Title:       "Delete user",
		Description: "Deletes a user for good with all of their notes, files and data.",
		Permission:  rbac.CanUpdateUsers,
		Confirm:     true,
	}, func(_ Env, args userID) (*Call, error) {
		return message(messages.NamespaceUsers, messages.UsersDelete, messages.UsersDeleteResponse, map[string]any{"id": args.ID})
	}),
}
