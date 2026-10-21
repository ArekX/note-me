package aitools

import "noteme/internal/http/websocket/messages"

type noteID struct {
	ID int64 `json:"id" desc:"Note id"`
}

type searchNotesArgs struct {
	Query    string   `json:"query" desc:"Words to find in titles and text; empty finds every note matching the other filters"`
	FolderID *int64   `json:"folder_id,omitempty" desc:"Only notes in this folder and its subfolders"`
	Tags     []string `json:"tags,omitempty" desc:"Only notes with all of these tags, without #"`
	Type     string   `json:"type,omitempty" enum:"general,shared,reminders,recycleBin" desc:"general (default): own notes; shared: notes shared with the user; reminders: notes with a reminder; recycleBin: deleted notes"`
	AfterID  *int64   `json:"after_id,omitempty" desc:"The last id of the previous page, for more results"`
}

type createNoteArgs struct {
	Title    string   `json:"title" desc:"Note title"`
	Text     string   `json:"text" desc:"Note text in markdown"`
	Tags     []string `json:"tags,omitempty" desc:"Tags without #"`
	FolderID *int64   `json:"folder_id,omitempty" zod:"nullable" desc:"Folder to put it in; omit or null for the top level"`
}

type updateNoteArgs struct {
	ID       int64                    `json:"id" desc:"Note id"`
	Title    *string                  `json:"title,omitempty" desc:"New title"`
	Text     *string                  `json:"text,omitempty" desc:"New markdown text, replacing the whole text"`
	Tags     *[]string                `json:"tags,omitempty" desc:"New tags without #, replacing the old ones; [] removes them"`
	FolderID messages.Optional[int64] `json:"folder_id,omitzero" zod:"nullable" desc:"Folder to move it into; null moves it to the top level"`
}

type noteHistoryArgs struct {
	NoteID int64 `json:"note_id" desc:"Note id"`
	Page   int   `json:"page,omitempty" desc:"Page of 20 versions, newest first, from 1"`
}

type historyVersionArgs struct {
	ID int64 `json:"id" desc:"Version id from get_note_history"`
}

type revertNoteArgs struct {
	NoteID    int64 `json:"note_id" desc:"Note id"`
	HistoryID int64 `json:"history_id" desc:"Version id from get_note_history"`
}

type noteProtectionArgs struct {
	ID        int64 `json:"id" desc:"Note id"`
	Protected bool  `json:"protected" desc:"true protects the note, false removes the protection"`
}

func withoutProtectedText(records any) {
	list, _ := records.([]any)
	for _, record := range list {
		if object, ok := record.(map[string]any); ok && object["is_encrypted"] == true {
			delete(object, "note")
		}
	}
}

var noteTools = []Tool{
	define(Tool{
		Name:        "search_notes",
		Title:       "Search notes",
		Description: "Searches notes by text, folder and tags. Results come in pages of 10; pass the last id as after_id for more. Protected notes show no text.",
		ReadOnly:    true,
		trim: func(response map[string]any) any {
			withoutProtectedText(response["results"])
			return response
		},
	}, func(_ Env, args searchNotesArgs) (*Call, error) {
		searchType := args.Type
		if searchType == "" {
			searchType = "general"
		}
		filters := map[string]any{"query": args.Query, "type": searchType}
		if args.FolderID != nil {
			filters["group_id"] = *args.FolderID
		}
		if len(args.Tags) > 0 {
			filters["tags"] = args.Tags
		}
		if args.AfterID != nil {
			filters["from_id"] = *args.AfterID
		}
		return message(messages.NamespaceNotes, messages.NotesSearch, messages.NotesSearchResponse, map[string]any{"filters": filters})
	}),
	define(Tool{
		Name:        "get_recent_notes",
		Title:       "Recent notes",
		Description: "Lists the notes the user opened most recently.",
		ReadOnly:    true,
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesGetRecentlyOpened, messages.NotesGetRecentlyOpenedResponse, map[string]any{})
	}),
	define(Tool{
		Name:        "get_note",
		Title:       "Read note",
		Description: "Reads a note: title, markdown text, tags, folder and whether it is protected.",
		ReadOnly:    true,
		Protected:   ProtectedRead,
	}, func(_ Env, args noteID) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesGet, messages.NotesGetResponse, map[string]any{"id": args.ID})
	}),
	define(Tool{
		Name:        "get_note_details",
		Title:       "Note details",
		Description: "Gets a note's folder, author and when it was created and last changed, without its text.",
		ReadOnly:    true,
	}, func(_ Env, args noteID) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesGetDetails, messages.NotesGetDetailsResponse, map[string]any{
			"id": args.ID,
			"options": map[string]any{
				"include_group": true, "include_timestamp": true, "include_user": true, "include_title": true,
			},
		})
	}),
	define(Tool{
		Name:        "create_note",
		Title:       "Create note",
		Description: "Creates a note.",
	}, func(_ Env, args createNoteArgs) (*Call, error) {
		tags := args.Tags
		if tags == nil {
			tags = []string{}
		}
		return message(messages.NamespaceNotes, messages.NotesCreate, messages.NotesCreateResponse, map[string]any{"data": map[string]any{
			"title": args.Title, "text": args.Text, "is_encrypted": false, "tags": tags, "group_id": args.FolderID,
		}})
	}),
	define(Tool{
		Name:        "update_note",
		Title:       "Update note",
		Description: "Changes a note's title, text, tags or folder; only the given fields change. Every change keeps the previous version in the note's history.",
		Protected:   ProtectedWrite,
	}, func(_ Env, args updateNoteArgs) (*Call, error) {
		data := map[string]any{}
		if args.Title != nil {
			data["title"] = *args.Title
		}
		if args.Text != nil {
			data["text"] = *args.Text
		}
		if args.Tags != nil {
			data["tags"] = *args.Tags
		}
		if args.FolderID.Set {
			data["group_id"] = args.FolderID.Value
		}
		return message(messages.NamespaceNotes, messages.NotesUpdate, messages.NotesUpdateResponse, map[string]any{"id": args.ID, "data": data})
	}),
	define(Tool{
		Name:        "delete_note",
		Title:       "Delete note",
		Description: "Moves a note to the recycle bin, where it can be restored for 30 days.",
	}, func(_ Env, args noteID) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesDelete, messages.NotesDeleteResponse, map[string]any{"id": args.ID})
	}),
	define[noteID](Tool{
		Name:        "open_note",
		Title:       "Open note",
		Description: "Opens a note in the app for the user to see.",
		Browser:     true,
	}, nil),
	define(Tool{
		Name:        "get_note_history",
		Title:       "Note history",
		Description: "Lists the stored versions of a note, newest first.",
		ReadOnly:    true,
	}, func(_ Env, args noteHistoryArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesFindHistory, messages.NotesFindHistoryResponse, map[string]any{"note_id": args.NoteID, "page": max(args.Page, 1)})
	}),
	define(Tool{
		Name:        "get_history_version",
		Title:       "Read note version",
		Description: "Reads one stored version of a note.",
		ReadOnly:    true,
		Protected:   ProtectedRead,
	}, func(_ Env, args historyVersionArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesGetHistoryData, messages.NotesGetHistoryDataResponse, map[string]any{"id": args.ID})
	}),
	define(Tool{
		Name:        "revert_note",
		Title:       "Revert note",
		Description: "Replaces a note's title, text and tags with a stored version; the current one is kept in the history.",
		Confirm:     true,
	}, func(_ Env, args revertNoteArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesRevertToHistory, messages.NotesRevertToHistoryResponse, map[string]any{"note_id": args.NoteID, "to_history_id": args.HistoryID})
	}),
	define[noteProtectionArgs](Tool{
		Name:        "set_note_protection",
		Title:       "Change note protection",
		Description: "Protects a note (its text is encrypted with the user's password and it can no longer be shared) or removes the protection.",
		Protected:   ProtectedProtection,
		Browser:     true,
	}, nil),
}
