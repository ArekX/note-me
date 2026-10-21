package aitools

import "noteme/internal/http/websocket/messages"

type findFilesArgs struct {
	Name       string `json:"name,omitempty" desc:"Part of the file name"`
	Kind       string `json:"kind,omitempty" enum:"image,document,other"`
	Visibility string `json:"visibility,omitempty" enum:"public,private"`
	Page       int    `json:"page,omitempty" desc:"Page of 20 files, from 1"`
}

type fileDetailsArgs struct {
	Identifiers []string `json:"identifiers" desc:"File identifiers, the part after /file/ in a note's link"`
}

type updateFileArgs struct {
	Identifier string `json:"identifier" desc:"File identifier"`
	IsPublic   bool   `json:"is_public" desc:"true lets anyone with the link see the file; false only the owner"`
}

type fileIdentifier struct {
	Identifier string `json:"identifier" desc:"File identifier"`
}

var fileTools = []Tool{
	define(Tool{
		Name:        "find_files",
		Title:       "Find files",
		Description: "Lists the user's uploaded files; a file is linked in notes as /file/<identifier>.",
		ReadOnly:    true,
	}, func(_ Env, args findFilesArgs) (*Call, error) {
		filters := map[string]any{}
		for key, value := range map[string]string{"name": args.Name, "kind": args.Kind, "visibility": args.Visibility} {
			if value != "" {
				filters[key] = value
			}
		}
		return message(messages.NamespaceFiles, messages.FilesFind, messages.FilesFindResponse, map[string]any{"filters": filters, "page": max(args.Page, 1)})
	}),
	define(Tool{
		Name:        "get_file_details",
		Title:       "File details",
		Description: "Gets the name, type, size and visibility of the user's files.",
		ReadOnly:    true,
	}, func(_ Env, args fileDetailsArgs) (*Call, error) {
		return message(messages.NamespaceFiles, messages.FilesGetDetails, messages.FilesGetDetailsResponse, map[string]any{"identifiers": args.Identifiers})
	}),
	define(Tool{
		Name:        "update_file",
		Title:       "Change file visibility",
		Description: "Makes a file public or private.",
	}, func(_ Env, args updateFileArgs) (*Call, error) {
		return message(messages.NamespaceFiles, messages.FilesUpdate, messages.FilesUpdateResponse, map[string]any{"identifier": args.Identifier, "is_public": args.IsPublic})
	}),
	define(Tool{
		Name:        "delete_file",
		Title:       "Delete file",
		Description: "Deletes an uploaded file for good; notes that link it show a broken link.",
		Confirm:     true,
	}, func(_ Env, args fileIdentifier) (*Call, error) {
		return message(messages.NamespaceFiles, messages.FilesDelete, messages.FilesDeleteResponse, map[string]any{"identifier": args.Identifier})
	}),
}
