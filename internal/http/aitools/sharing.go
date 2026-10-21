package aitools

import "noteme/internal/http/websocket/messages"

type findShareUsersArgs struct {
	Name string `json:"name,omitempty" desc:"Part of the user's name"`
	Page int    `json:"page,omitempty" desc:"Page of 20 users, from 1"`
}

type shareWithUsersArgs struct {
	NoteID  int64   `json:"note_id" desc:"Note id"`
	UserIDs []int64 `json:"user_ids" desc:"Every user the note is shared with after the change; users left out lose the note"`
}

type createPublicLinkArgs struct {
	NoteID    int64  `json:"note_id" desc:"Note id"`
	ExpiresAt *int64 `json:"expires_at,omitempty" desc:"Unix time in seconds when the link stops working; omit for a link that does not expire"`
}

type removePublicLinkArgs struct {
	NoteID int64 `json:"note_id" desc:"Note id"`
	LinkID int64 `json:"link_id" desc:"Link id from get_share_data"`
}

var sharingTools = []Tool{
	define(Tool{
		Name:        "get_share_data",
		Title:       "Sharing of a note",
		Description: "Lists the users a note is shared with and its public links; a link opens at /public/<identifier>.",
		ReadOnly:    true,
	}, func(_ Env, args noteIDArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesGetShareData, messages.NotesGetShareDataResponse, map[string]any{"note_id": args.NoteID})
	}),
	define(Tool{
		Name:        "find_users_to_share_with",
		Title:       "Find users",
		Description: "Finds other users a note can be shared with.",
		ReadOnly:    true,
	}, func(_ Env, args findShareUsersArgs) (*Call, error) {
		filters := map[string]any{}
		if args.Name != "" {
			filters["name"] = args.Name
		}
		return message(messages.NamespaceUsers, messages.UsersFindPick, messages.UsersFindPickResponse, map[string]any{"filters": filters, "page": max(args.Page, 1)})
	}),
	define(Tool{
		Name:        "share_with_users",
		Title:       "Share with users",
		Description: "Sets the users a note is shared with; they get a notification. Protected notes cannot be shared.",
		Confirm:     true,
	}, func(_ Env, args shareWithUsersArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesShareToUsers, messages.NotesShareToUsersResponse, map[string]any{"note_id": args.NoteID, "user_ids": args.UserIDs})
	}),
	define(Tool{
		Name:        "create_public_link",
		Title:       "Create public link",
		Description: "Creates a link anyone can use to read a note without signing in. Protected notes cannot be shared.",
		Confirm:     true,
	}, func(_ Env, args createPublicLinkArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesCreatePublicShare, messages.NotesCreatePublicShareResponse, map[string]any{"note_id": args.NoteID, "expires_at": args.ExpiresAt})
	}),
	define(Tool{
		Name:        "remove_public_link",
		Title:       "Remove public link",
		Description: "Removes a public link of a note.",
	}, func(_ Env, args removePublicLinkArgs) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesRemovePublicShare, messages.NotesRemovePublicShareResponse, map[string]any{"note_id": args.NoteID, "id": args.LinkID})
	}),
	define(Tool{
		Name:        "find_shared_with_me",
		Title:       "Shared with me",
		Description: "Lists the notes other users shared with this user, newest first.",
		ReadOnly:    true,
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesFindShared, messages.NotesFindSharedResponse, map[string]any{"filters": map[string]any{}})
	}),
	define(Tool{
		Name:        "get_shared_note",
		Title:       "Read shared note",
		Description: "Reads a note another user shared with this user.",
		ReadOnly:    true,
	}, func(_ Env, args noteID) (*Call, error) {
		return message(messages.NamespaceNotes, messages.NotesGetShared, messages.NotesGetSharedResponse, map[string]any{"id": args.ID})
	}),
}
