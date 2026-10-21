package repository

import "context"

type SharedNoteRecord struct {
	Id          int64
	Title       string
	Note        string
	IsEncrypted bool
	IsWide      bool
	Tags        []string
	UpdatedAt   int64
	UserName    string
}

type PublicShareRecord struct {
	Id         int64
	NoteId     int64
	Identifier string
	CreatedAt  int64
	ExpiresAt  *int64
}

type PickUserRecord struct {
	Id       int64
	Name     string
	Username string
}

type NoteShareData struct {
	Users []PickUserRecord
	Links []PublicShareRecord
}

type UserSharedNoteRecord struct {
	Id          int64
	ShareId     int64
	Title       string
	IsEncrypted bool
	UserName    string
	CreatedAt   int64
}

type SharedNotesFilters struct {
	FromCreatedAt *int64
	FromShareId   *int64
	Limit         int
}

type ExpiredPublicShare struct {
	NoteId  int64
	OwnerId int
}

type PickUserFilters struct {
	Name           string
	Username       string
	UserIds        []int64
	ExcludeUserIds []int64
}

type Shares interface {
	GetPublicShareNote(ctx context.Context, identifier string) (*SharedNoteRecord, error)
	GetUserShareNote(ctx context.Context, userId int, noteId int64) (*SharedNoteRecord, error)
	CreatePublicShare(ctx context.Context, noteId int64, expiresAt *int64) (*PublicShareRecord, error)
	RemovePublicShare(ctx context.Context, noteId int64, id int64) error
	SetUserShare(ctx context.Context, ownerId int, noteId int64, userIds []int64) ([]int64, error)
	GetNoteShareData(ctx context.Context, noteId int64) (*NoteShareData, error)
	FindUserSharedNotes(ctx context.Context, userId int, filters SharedNotesFilters) ([]UserSharedNoteRecord, error)
	SearchSharedNotes(ctx context.Context, userId int, filters SearchFilters) ([]UserSharedNoteRecord, error)
	RemoveExpiredPublicShares(ctx context.Context) ([]ExpiredPublicShare, error)
	// Includes shares of deleted notes.
	FindNoteShareUserIds(ctx context.Context, noteIds []int64) ([]int, error)
	SharedNoteWithUser(ctx context.Context, userId int, noteId int64) (bool, error)
	FindPickerUsers(ctx context.Context, filters PickUserFilters, page int) (*Paged[PickUserRecord], error)
	// Takes the note away from everyone but its owner: user shares, links,
	// other users' reminders and their notifications about it.
	RemoveNoteShares(ctx context.Context, noteId int64) error
}
