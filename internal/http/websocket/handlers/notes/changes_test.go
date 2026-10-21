package notes

import (
	"context"
	"testing"

	"noteme/internal/components"
	"noteme/internal/eventbus"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/changes"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func TestOwnerChangesReachRecipients(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	tab := s.Dial(t, handlerstest.AdminID)
	reader := s.AddUser(t, "reader")
	readerConn := s.Dial(t, reader)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)
	if _, err := s.C.Repository.Shares().SetUserShare(context.Background(), handlerstest.AdminID, 1, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}

	for _, step := range []struct{ message, want string }{
		{`"type":"updateNote","id":1,"data":{"title":"Renamed"}`, "updateNoteResponse"},
		{`"type":"deleteNote","id":1`, "deleteNoteResponse"},
		{`"type":"restoreDeletedNote","id":1`, "restoreDeletedNoteResponse"},
		{`"type":"deleteNote","id":1`, "deleteNoteResponse"},
		{`"type":"fullyDeleteNote","id":1`, "fullyDeleteNoteResponse"},
	} {
		if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes",`+step.message+`}`); response["type"] != step.want {
			t.Fatalf("%s = %v", step.message, response)
		}
		if other := handlerstest.Read(t, tab); other["type"] != step.want {
			t.Errorf("%s: other tab = %v", step.message, other)
		}
		handlerstest.ExpectDataChanged(t, readerConn, "note", "[1]")
	}

	// The share went with the note.
	s.CreateNote(t, handlerstest.AdminID, "Other", nil)
	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":2,"data":{"title":"Unshared"}}`)
	if response := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"findSharedNotes","filters":{"limit":5}}`); response["type"] != "findSharedNotesResponse" {
		t.Errorf("reader got %v before its response", response)
	}
}

func TestShareChangesReachEveryTab(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	tab := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)

	created := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"createPublicShare","note_id":1,"expires_at":null}`)
	if other := handlerstest.Read(t, tab); other["type"] != "createPublicShareResponse" {
		t.Errorf("other tab = %v", other)
	}
	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"removePublicShare","note_id":1,"id":`+handlerstest.Encode(t, created["record"].(map[string]any)["id"])+`}`)
	if other := handlerstest.Read(t, tab); other["type"] != "removePublicShareResponse" {
		t.Errorf("other tab = %v", other)
	}
	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"shareToUsers","note_id":1,"user_ids":[]}`)
	handlerstest.ExpectType(t, tab, "shareToUsersResponse")
}

func TestWorkerChangesReachUsers(t *testing.T) {
	s := handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		return []ws.Namespace{New(c), changes.New(c)}
	})
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)

	s.C.Bus.Publish(ctx, eventbus.ReminderTriggered{UserID: handlerstest.AdminID, NoteID: 4})
	handlerstest.ExpectDataChanged(t, conn, "reminder", "[4]")

	s.C.Bus.Publish(ctx, eventbus.PublicShareExpired{OwnerID: handlerstest.AdminID, NoteID: 5})
	handlerstest.ExpectDataChanged(t, conn, "share", "[5]")
}
