package ai

import (
	"context"
	"fmt"

	"noteme/internal/components/repository"
)

// The page the browser had open when the message was sent, named by its
// route (frontend/src/router).
type openPage struct {
	Name   string `json:"name"`
	NoteID *int64 `json:"note_id"`
}

var pageLabels = map[string]string{
	"dashboard":               "the dashboard",
	"note-new":                "the editor of a new, unsaved note",
	"profile":                 "their profile",
	"profile-passkeys":        "their passkeys",
	"profile-data":            "the import and export of their data",
	"profile-files":           "their files",
	"settings":                "Settings → Backups",
	"settings-users":          "Settings → Users",
	"settings-tags":           "Settings → Tags",
	"settings-files":          "Settings → Files",
	"settings-periodic-tasks": "Settings → Tasks",
	"settings-audit-log":      "Settings → Audit log",
	"settings-ai":             "Settings → AI",
	"settings-server-log":     "Settings → Server log",
}

// Titles come from the database, scoped to the user, so the browser cannot
// put text of its own into the prompt; a note the user cannot see gives no
// page at all. The title is quoted, since another user may have written it.
func (n *Namespace) describePage(ctx context.Context, userID int, page *openPage) (string, error) {
	if page == nil {
		return "", nil
	}
	if label, ok := pageLabels[page.Name]; ok {
		return label, nil
	}
	if page.NoteID == nil {
		return "", nil
	}
	id := *page.NoteID
	switch page.Name {
	case "note-view", "note-edit":
		exists, err := n.repo.Notes().NoteExists(ctx, userID, id, false)
		if err != nil || !exists {
			return "", err
		}
		note, err := n.repo.Notes().GetNoteDetails(ctx, userID, id, repository.NoteDetailsOptions{IncludeTitle: true})
		if err != nil || note == nil {
			return "", err
		}
		action := "viewing"
		if page.Name == "note-edit" {
			action = "editing"
		}
		return fmt.Sprintf("their note #%d titled %q (%s it)", id, note.Title, action), nil
	case "note-shared":
		note, err := n.repo.Shares().GetUserShareNote(ctx, userID, id)
		if err != nil || note == nil {
			return "", err
		}
		return fmt.Sprintf("note #%d titled %q, shared with them by %s", id, note.Title, note.UserName), nil
	}
	return "", nil
}
