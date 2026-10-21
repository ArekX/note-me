package aitools

import (
	"noteme/internal/http/rbac"
	"noteme/internal/http/websocket/messages"
)

type findTagsArgs struct {
	Name string `json:"name,omitempty" desc:"Part of the tag name"`
	Page int    `json:"page,omitempty" desc:"Page of 20 tags, from 1"`
}

type createTagArgs struct {
	Name string `json:"name" desc:"Tag name without #"`
}

type renameTagArgs struct {
	ID   int64  `json:"id" desc:"Tag id"`
	Name string `json:"name" desc:"New name without #"`
}

type tagID struct {
	ID int64 `json:"id" desc:"Tag id"`
}

// Tags are shared by every user, so changing them is for admins.
var tagTools = []Tool{
	define(Tool{
		Name:        "find_tags",
		Title:       "Find tags",
		Description: "Lists the tags used on this NoteMe server.",
		ReadOnly:    true,
		Permission:  rbac.CanUpdateTags,
	}, func(_ Env, args findTagsArgs) (*Call, error) {
		return message(messages.NamespaceTags, messages.TagsFind, messages.TagsFindResponse, map[string]any{"filters": map[string]any{"name": args.Name}, "page": max(args.Page, 1)})
	}),
	define(Tool{
		Name:        "create_tag",
		Title:       "Create tag",
		Description: "Creates a tag.",
		Permission:  rbac.CanUpdateTags,
	}, func(_ Env, args createTagArgs) (*Call, error) {
		return message(messages.NamespaceTags, messages.TagsCreate, messages.TagsCreateResponse, map[string]any{"data": map[string]any{"name": args.Name}})
	}),
	define(Tool{
		Name:        "rename_tag",
		Title:       "Rename tag",
		Description: "Renames a tag on every note that has it.",
		Permission:  rbac.CanUpdateTags,
	}, func(_ Env, args renameTagArgs) (*Call, error) {
		return message(messages.NamespaceTags, messages.TagsUpdate, messages.TagsUpdateResponse, map[string]any{"id": args.ID, "data": map[string]any{"name": args.Name}})
	}),
	define(Tool{
		Name:        "delete_tag",
		Title:       "Delete tag",
		Description: "Deletes a tag and removes it from every note.",
		Permission:  rbac.CanUpdateTags,
		Confirm:     true,
	}, func(_ Env, args tagID) (*Call, error) {
		return message(messages.NamespaceTags, messages.TagsDelete, messages.TagsDeleteResponse, map[string]any{"id": args.ID})
	}),
}
