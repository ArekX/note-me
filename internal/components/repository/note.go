package repository

import (
	"context"
	"errors"
)

var ErrNoteNotFound = errors.New("Note does not exist.")

type NoteRecord struct {
	Id          int64
	Title       string
	Note        string
	IsEncrypted bool
	IsWide      bool
	UserId      int
	CreatedAt   int64
	UpdatedAt   int64
	LastOpenAt  *int64
}

type NewNoteRecord struct {
	Title       string
	Note        string
	IsEncrypted bool
	IsWide      bool
	UserId      int
}

// IsWide only changes how the note is laid out, so on its own it leaves
// updated_at alone.
type NoteUpdate struct {
	Title       *string
	Note        *string
	IsEncrypted *bool
	IsWide      *bool
}

type ViewNoteRecord struct {
	Id          int64
	Title       string
	Note        string
	IsEncrypted bool
	IsWide      bool
	GroupId     *int64
	GroupName   *string
	Tags        []string
	UpdatedAt   int64
}

type NoteDetailsOptions struct {
	IncludeGroup     bool
	IncludeTimestamp bool
	IncludeUser      bool
	IncludeTitle     bool
	IncludeNote      bool
	// The owner's notes in the recycle bin too.
	IncludeDeleted bool
}

type NoteDetailsRecord struct {
	IsDeleted   bool
	GroupId     *int64
	GroupName   *string
	CreatedAt   int64
	UpdatedAt   int64
	UserName    string
	IsEncrypted bool
	Note        string
	Title       string
	UserId      int
}

type RecentNoteRecord struct {
	Id          int64
	Title       string
	GroupId     *int64
	GroupName   *string
	UpdatedAt   int64
	LastOpenAt  *int64
	IsEncrypted bool
}

type DeletedNoteRecord struct {
	Id          int64
	Title       string
	IsEncrypted bool
	DeletedAt   *int64
}

type RemovedNote struct {
	Id     int64
	UserId int
}

type Notes interface {
	CreateNote(ctx context.Context, note NewNoteRecord) (*NoteRecord, error)
	AssignNoteToGroup(ctx context.Context, userId int, noteId int64, groupId *int64) error
	UpdateNote(ctx context.Context, userId int, id int64, update NoteUpdate) error
	UpdateNoteParent(ctx context.Context, userId int, noteId int64, groupId *int64) error
	GetNote(ctx context.Context, userId int, id int64) (*ViewNoteRecord, error)
	UpdateLastOpenAt(ctx context.Context, userId int, noteId int64) error
	GetNoteDetails(ctx context.Context, userId int, noteId int64, options NoteDetailsOptions) (*NoteDetailsRecord, error)
	DeleteNote(ctx context.Context, userId int, noteId int64) error
	NoteExists(ctx context.Context, userId int, noteId int64, isDeleted bool) (bool, error)
	FindRecentlyOpenedNotes(ctx context.Context, userId int) ([]RecentNoteRecord, error)
	FindDeletedNotes(ctx context.Context, userId int, fromId int64) ([]DeletedNoteRecord, error)
	FullyDeleteNotes(ctx context.Context, noteIds []int64) error
	RemoveExpiredDeletedNotes(ctx context.Context, days int) ([]RemovedNote, error)
	RestoreDeletedNote(ctx context.Context, userId int, noteId int64) (bool, error)
	GetUserNoteCount(ctx context.Context, userId int) (int, error)
}
