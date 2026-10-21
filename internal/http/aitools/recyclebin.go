package aitools

import "noteme/internal/http/websocket/messages"

type deletedNotesArgs struct {
	AfterID *int64 `json:"after_id,omitempty" desc:"The last id of the previous page, for more results"`
}

var recycleBinTools = []Tool{
	define(Tool{
		Name:        "find_deleted_notes",
		Title:       "List recycle bin",
		Description: "Lists the notes in the recycle bin; they are deleted for good 30 days after they were deleted.",
		ReadOnly:    true,
	}, func(_ Env, args deletedNotesArgs) (*Call, error) {
		filters := map[string]any{}
		if args.AfterID != nil {
			filters["fromId"] = *args.AfterID
		}
		return message(messages.NamespaceNotes, messages.NotesFindDeleted, messages.NotesFindDeletedResponse, map[string]any{"filters": filters})
	}),
	define(Tool{
		Name:        "restore_note",
		Title:       "Restore note",
		Description: "Restores a note from the recycle bin to the top level of the tree.",
	}, func(_ Env, args noteID) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesRestoreDeleted, messages.NotesRestoreDeletedResponse, map[string]any{"id": args.ID})
	}),
	define(Tool{
		Name:        "delete_note_forever",
		Title:       "Delete note forever",
		Description: "Deletes a note in the recycle bin for good, with its history, reminders and shares.",
		Confirm:     true,
	}, func(_ Env, args noteID) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesFullyDelete, messages.NotesFullyDeleteResponse, map[string]any{"id": args.ID})
	}),
}
