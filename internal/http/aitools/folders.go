package aitools

import "noteme/internal/http/websocket/messages"

type folderID struct {
	ID int64 `json:"id" desc:"Folder id"`
}

type getTreeArgs struct {
	FolderID *int64 `json:"folder_id,omitempty" zod:"nullable" desc:"Folder whose items to list; omit or null for the top level"`
}

type createFolderArgs struct {
	Name     string `json:"name" desc:"Folder name"`
	ParentID *int64 `json:"parent_id,omitempty" zod:"nullable" desc:"Folder to create it in; omit or null for the top level"`
}

type updateFolderArgs struct {
	ID       int64                    `json:"id" desc:"Folder id"`
	Name     *string                  `json:"name,omitempty" desc:"New name"`
	ParentID messages.Optional[int64] `json:"parent_id,omitzero" zod:"nullable" desc:"Folder to move it into; null moves it to the top level"`
}

var folderTools = []Tool{
	define(Tool{
		Name:        "get_tree",
		Title:       "List folder",
		Description: "Lists the folders and notes in a folder of the user's tree, or at the top level. is_encrypted 1 marks a protected note.",
		ReadOnly:    true,
	}, func(_ Env, args getTreeArgs) (*Call, error) {
		return message(messages.NamespaceTree, messages.TreeGet, messages.TreeGetResponse, map[string]any{"parent_id": args.FolderID})
	}),
	define(Tool{
		Name:        "get_folder",
		Title:       "Get folder",
		Description: "Gets a folder's name and parent.",
		ReadOnly:    true,
	}, func(_ Env, args folderID) (*Call, error) {
		return message(messages.NamespaceGroups, messages.GroupsGetSingle, messages.GroupsGetSingleResponse, map[string]any{"id": args.ID})
	}),
	define(Tool{
		Name:        "create_folder",
		Title:       "Create folder",
		Description: "Creates a folder.",
	}, func(_ Env, args createFolderArgs) (*Call, error) {
		return message(messages.NamespaceGroups, messages.GroupsCreate, messages.GroupsCreateResponse,
			map[string]any{"data": map[string]any{"name": args.Name, "parent_id": args.ParentID}})
	}),
	define(Tool{
		Name:        "update_folder",
		Title:       "Update folder",
		Description: "Renames a folder or moves it into another folder.",
	}, func(_ Env, args updateFolderArgs) (*Call, error) {
		data := map[string]any{}
		if args.Name != nil {
			data["name"] = *args.Name
		}
		if args.ParentID.Set {
			data["parent_id"] = args.ParentID.Value
		}
		return message(messages.NamespaceGroups, messages.GroupsUpdate, messages.GroupsUpdateResponse, map[string]any{"id": args.ID, "data": data})
	}),
	define(Tool{
		Name:        "delete_folder",
		Title:       "Delete folder",
		Description: "Deletes a folder with every folder in it and moves its notes to the recycle bin.",
		Confirm:     true,
	}, func(_ Env, args folderID) (*Call, error) {
		return message(messages.NamespaceGroups, messages.GroupsDelete, messages.GroupsDeleteResponse, map[string]any{"id": args.ID})
	}),
}
