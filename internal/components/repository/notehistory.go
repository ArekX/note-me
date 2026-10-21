package repository

import "context"

type NoteHistoryMetaRecord struct {
	Id          int64
	Version     string
	CreatedAt   int64
	IsEncrypted bool
}

type NoteHistoryDataRecord struct {
	NoteId      int64
	Version     string
	Note        string
	Title       string
	IsEncrypted bool
	Tags        string
}

type NoteHistory interface {
	AddHistory(ctx context.Context, userId int, noteId int64, isReversal bool) error
	FindHistory(ctx context.Context, userId int, noteId int64, page int) (*Paged[NoteHistoryMetaRecord], error)
	GetHistoryRecordData(ctx context.Context, userId int, id int64) (*NoteHistoryDataRecord, error)
	DeleteHistoryRecord(ctx context.Context, noteId int64, id int64) error
}
