package repository

import "context"

type SearchFilters struct {
	FromId  *int64
	Query   string
	GroupId *int64
	Tags    []string
}

type NoteSearchRecord struct {
	Id          int64
	Title       string
	Note        string
	IsEncrypted bool
	GroupName   *string
	UpdatedAt   int64
	UserName    string
}

type Search interface {
	SearchGeneral(ctx context.Context, userId int, filters SearchFilters) ([]NoteSearchRecord, error)
	SearchDeletedNotes(ctx context.Context, userId int, filters SearchFilters) ([]DeletedNoteRecord, error)
}
