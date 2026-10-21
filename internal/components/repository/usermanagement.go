package repository

import "context"

type UserUpdate struct {
	Name        string
	Role        string
	Timezone    string
	NewPassword string
}

type UserFilters struct {
	Name     string
	Username string
	Role     string
}

type UserRecord struct {
	Id                      int
	Name                    string
	Username                string
	Timezone                string
	Role                    string
	IsPasswordResetRequired bool
	CreatedAt               int64
	UpdatedAt               int64
}

// What a deleted user leaves outside the database.
type DeletedUser struct {
	FileIdentifiers []string
}

type UserManagement interface {
	UpdateUserRecord(ctx context.Context, id int, update UserUpdate) (bool, error)
	FindUsers(ctx context.Context, filters UserFilters, page int) (*Paged[UserRecord], error)
	// Removes the user with everything they own; tags they created that other
	// notes still use are handed to tagOwnerId. nil when there is no such user.
	DeleteUserRecord(ctx context.Context, id int, tagOwnerId int) (*DeletedUser, error)
	CountUsersWithRole(ctx context.Context, role string) (int, error)
}
