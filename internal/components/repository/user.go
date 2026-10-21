package repository

import (
	"context"
	"errors"
)

var ErrIncorrectOldPassword = errors.New("Old password is incorrect")

type UserLoginRecord struct {
	Id                      int
	Name                    string
	Username                string
	Timezone                string
	Role                    string
	OnboardingState         map[string]bool
	IsPasswordResetRequired bool
	PreferredEditor         string
	// A file identifier; empty when none is set.
	ProfilePicture string
	CreatedAt      int64
	UpdatedAt      int64
}

type NewUserRecord struct {
	Name     string
	Username string
	Password string
	Role     string
	Timezone string
}

type UserProfileData struct {
	Name            string
	Timezone        string
	PreferredEditor string
	OldPassword     string
	NewPassword     string
}

type Users interface {
	UserExists(ctx context.Context, username string) (bool, error)
	GetUserIdByUsername(ctx context.Context, username string) (int, error)
	GetUserByLogin(ctx context.Context, username, password string) (*UserLoginRecord, error)
	GetUserById(ctx context.Context, id int) (*UserLoginRecord, error)
	CreateUserRecord(ctx context.Context, user NewUserRecord) (int, error)
	UpdateUserProfile(ctx context.Context, userId int, data UserProfileData) (bool, error)
	ValidateUserPassword(ctx context.Context, userId int, password string) (bool, error)
	GetNoteEncryptionKey(ctx context.Context, userId int) (string, error)
	UpdateOnboardingState(ctx context.Context, userId int, changes map[string]bool) (map[string]bool, error)
	// An empty identifier removes the picture.
	UpdateProfilePicture(ctx context.Context, userId int, identifier string) error
	// Removes the file from every profile that shows it; true when one did.
	ClearProfilePicture(ctx context.Context, identifier string) (bool, error)
}
