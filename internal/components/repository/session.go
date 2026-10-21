package repository

import "context"

type SessionRecord struct {
	Key    string
	Data   string
	UserId int
}

type NewSessionRecord struct {
	Key       string
	UserId    int
	ExpiresAt int64
	Data      []byte
}

type Sessions interface {
	SessionExists(ctx context.Context, key string) (bool, error)
	GetSessionByUserId(ctx context.Context, userId int) (*SessionRecord, error)
	DeleteSessionByUserId(ctx context.Context, userId int) error
	DeleteOtherSessions(ctx context.Context, userId int, keepKey string) error
	DeleteExpiredSessions(ctx context.Context) error
	UpdateSessionData(ctx context.Context, key string, data []byte) error
	UpdateUserSessionsData(ctx context.Context, userId int, data []byte) error
	CreateNewSession(ctx context.Context, record NewSessionRecord) (int64, error)
	GetSessionByKey(ctx context.Context, key string) (*SessionRecord, error)
}
