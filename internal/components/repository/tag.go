package repository

import (
	"context"
	"errors"
)

var ErrTagExists = errors.New("Tag with this name already exists.")

type TagRecord struct {
	Id   int64
	Name string
}

type Tags interface {
	ResolveTags(ctx context.Context, userId int, tags []string) ([]TagRecord, error)
	LinkNoteWithTags(ctx context.Context, userId int, noteId int64, tags []string) error
	FindTags(ctx context.Context, name string, page int) (*Paged[TagRecord], error)
	CreateTagRecord(ctx context.Context, userId int, name string) (*TagRecord, error)
	GetTagRecord(ctx context.Context, id int64) (*TagRecord, error)
	UpdateTagRecord(ctx context.Context, id int64, name string) error
	DeleteTagRecord(ctx context.Context, id int64) error
}
