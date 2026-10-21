package repository

import "context"

const (
	TreeItemGroup = "group"
	TreeItemNote  = "note"
)

type TreeRecord struct {
	Type        string
	Id          int64
	Name        string
	IsEncrypted int
	HasChildren int
}

type Tree interface {
	GetTreeList(ctx context.Context, userId int, groupId *int64, itemType string) ([]TreeRecord, error)
}
