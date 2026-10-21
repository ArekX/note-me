package notes

import (
	"context"
	"testing"

	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func deleteNote(t *testing.T, s *handlerstest.Server, userID int, noteID int64) {
	t.Helper()
	if err := s.C.Repository.Notes().DeleteNote(context.Background(), userID, noteID); err != nil {
		t.Fatal(err)
	}
}

func TestRecycleBin(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	otherTab := s.Dial(t, handlerstest.AdminID)
	other := s.AddUser(t, "other")
	group, err := s.C.Repository.Groups().CreateGroup(context.Background(), repository.NewGroupRecord{Name: "Work", UserId: handlerstest.AdminID})
	if err != nil {
		t.Fatal(err)
	}

	plan := s.CreateNote(t, handlerstest.AdminID, "Plan", &group.Id)
	draft := s.CreateNote(t, handlerstest.AdminID, "Draft", nil)
	theirs := s.CreateNote(t, other, "Theirs", nil)
	deleteNote(t, s, handlerstest.AdminID, plan)
	deleteNote(t, s, handlerstest.AdminID, draft)
	deleteNote(t, s, other, theirs)

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"findDeletedNotes","filters":{"fromId":0}}`)
	records := response["records"].([]any)
	if response["type"] != "findDeletedNotesResponse" || len(records) != 2 || records[0].(map[string]any)["title"] != "Plan" || records[0].(map[string]any)["deleted_at"] == nil {
		t.Fatalf("find = %v", response)
	}

	search := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"searchNote","filters":{"query":"dra","type":"recycleBin"}}`)
	if results := search["results"].([]any); len(results) != 1 || results[0].(map[string]any)["title"] != "Draft" {
		t.Errorf("search = %v", search)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"restoreDeletedNote","id":1}`)
	restored := response["restored_note"].(map[string]any)
	if response["type"] != "restoreDeletedNoteResponse" || restored["title"] != "Plan" || restored["group_id"] != nil {
		t.Errorf("restore = %v", response)
	}
	if pushed := handlerstest.Read(t, otherTab); pushed["type"] != "restoreDeletedNoteResponse" {
		t.Errorf("other tab got %v", pushed)
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"restoreDeletedNote","id":3}`); response["restored_note"] != nil {
		t.Errorf("foreign restore = %v", response)
	}

	for _, id := range []string{"1", "3"} {
		if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"fullyDeleteNote","id":`+id+`}`); response["message"] != "Note does not exist." {
			t.Errorf("fully delete %s = %v", id, response)
		}
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"fullyDeleteNote","id":2}`)
	if response["type"] != "fullyDeleteNoteResponse" || response["deleted_id"] != float64(2) {
		t.Errorf("fully delete = %v", response)
	}
	if pushed := handlerstest.Read(t, otherTab); pushed["type"] != "fullyDeleteNoteResponse" {
		t.Errorf("other tab got %v", pushed)
	}
	if exists, _ := s.C.Repository.Notes().NoteExists(context.Background(), handlerstest.AdminID, 2, true); exists {
		t.Error("note still exists")
	}
}

func TestNotifyFullyDeletedNote(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	other := s.AddUser(t, "other")
	otherConn := s.Dial(t, other)
	// The connection is registered once it has answered a request.
	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getRecentlyOpenedNotes"}`)

	s.C.Bus.Publish(context.Background(), eventbus.NoteFullyDeleted{UserID: handlerstest.AdminID, NoteID: 7})

	if pushed := handlerstest.Read(t, conn); pushed["type"] != "fullyDeleteNoteResponse" || pushed["deleted_id"] != float64(7) || pushed["namespace"] != "notes" {
		t.Errorf("pushed = %v", pushed)
	}

	response := handlerstest.Request(t, otherConn, `{"requestId":"r","namespace":"notes","type":"getRecentlyOpenedNotes"}`)
	if response["type"] != "getRecentlyOpenedNotesResponse" {
		t.Errorf("other user got %v first", response)
	}
}
