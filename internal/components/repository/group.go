package repository

import (
	"context"
	"errors"
)

var (
	ErrGroupNotFound       = errors.New("Group does not exist!")
	ErrGroupOwnParent      = errors.New("Group cannot be its own parent")
	ErrGroupIntoDescendant = errors.New("Group cannot be moved into its own subgroup")
)

type GroupRecord struct {
	Id           int64
	Name         string
	ParentId     *int64
	CreatedAt    int64
	HasSubgroups *int
	HasNotes     *int
}

type NewGroupRecord struct {
	Name     string
	ParentId *int64
	UserId   int
}

type GroupUpdate struct {
	Name *string
	// ParentId is applied only when SetParent is true; nil moves the group to the top level.
	SetParent bool
	ParentId  *int64
}

type DeletedGroupChildren struct {
	GroupIds []int64
	NoteIds  []int64
}

type Groups interface {
	GetGroupById(ctx context.Context, userId int, id int64) (*GroupRecord, error)
	GroupExists(ctx context.Context, userId int, id int64) (bool, error)
	CreateGroup(ctx context.Context, group NewGroupRecord) (*GroupRecord, error)
	UpdateGroup(ctx context.Context, userId int, id int64, update GroupUpdate) error
	DeleteGroup(ctx context.Context, userId int, id int64) error
	DeleteGroupChildren(ctx context.Context, userId int, parentId int64) (*DeletedGroupChildren, error)
}
