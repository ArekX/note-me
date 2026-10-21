package repository

import "context"

type PasskeyCredential struct {
	CredentialId     string
	PublicKey        []byte
	Counter          int64
	IsBackupEligible bool
	IsBackedUp       bool
	Transports       string
}

type NewPasskeyRecord struct {
	PasskeyCredential
	UserId int
	Name   string
}

type PasskeyLoginRecord struct {
	PasskeyCredential
	UserId     int
	UserHandle string
}

type UserPasskeyRecord struct {
	Id         int
	Name       string
	LastUsedAt int64
	CreatedAt  int64
	Transports string
}

type Passkeys interface {
	GetPasskeyUserHandle(ctx context.Context, userId int) (string, error)
	SetPasskeyUserHandle(ctx context.Context, userId int, handle string) error
	GetUserPasskeyCredentials(ctx context.Context, userId int) ([]PasskeyCredential, error)
	GetPasskeyLogin(ctx context.Context, credentialId string) (*PasskeyLoginRecord, error)
	CreatePasskey(ctx context.Context, record NewPasskeyRecord) (bool, error)
	UpdatePasskeyAfterUse(ctx context.Context, credentialId string, counter int64, isBackedUp bool) error
	FindUserPasskeys(ctx context.Context, userId, page int) (*Paged[UserPasskeyRecord], error)
	UpdatePasskeyName(ctx context.Context, id, userId int, name string) (bool, error)
	DeletePasskey(ctx context.Context, id, userId int) (bool, error)
	DeleteUserPasskeys(ctx context.Context, userId int) error
}
