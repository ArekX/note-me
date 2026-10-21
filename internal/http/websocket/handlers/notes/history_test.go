package notes

import (
	"testing"

	"noteme/internal/http/websocket/handlers/handlerstest"
)

func TestNoteHistoryFlow(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	otherTab := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil, "work")
	s.CreateNote(t, handlerstest.AdminID, "Other", nil)

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{}}`)
	read := func() map[string]any {
		return handlerstest.Read(t, otherTab)
	}
	read()
	history := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"findNoteHistory","note_id":1,"page":1}`)
	if records := history["records"].(map[string]any); records["total"] != float64(0) {
		t.Errorf("empty update added a version: %v", records)
	}

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{"title":"Plan v2","text":"new","tags":["home"]}}`)
	read()

	history = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"findNoteHistory","note_id":1,"page":1}`)
	results := history["records"].(map[string]any)["results"].([]any)
	if len(results) != 1 || results[0].(map[string]any)["version"] != "Version 1" {
		t.Fatalf("history = %v", history)
	}
	versionID := results[0].(map[string]any)["id"]

	data := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteHistoryData","id":`+handlerstest.Encode(t, versionID)+`}`)
	if got := handlerstest.Encode(t, data["data"]); got != `{"is_encrypted":false,"note":"text","tags":"work","title":"Plan","version":"Version 1"}` {
		t.Errorf("version data = %s", got)
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"revertNoteToHistory","note_id":2,"to_history_id":`+handlerstest.Encode(t, versionID)+`}`); response["message"] != historyNotFound {
		t.Errorf("revert into another note = %v", response)
	}

	reverted := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"revertNoteToHistory","note_id":1,"to_history_id":`+handlerstest.Encode(t, versionID)+`}`)
	if got := handlerstest.Encode(t, reverted); got != `{"is_encrypted":false,"namespace":"notes","note":"text","note_id":1,"requestId":"r","tags":["work"],"title":"Plan","type":"revertNoteToHistoryResponse"}` {
		t.Errorf("revert = %s", got)
	}
	if pushed := read(); pushed["type"] != "revertNoteToHistoryResponse" {
		t.Errorf("other tab got %v", pushed)
	}

	history = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"findNoteHistory","note_id":1,"page":1}`)
	results = history["records"].(map[string]any)["results"].([]any)
	if len(results) != 2 || results[0].(map[string]any)["version"] != "Version 2 (before reversal)" {
		t.Fatalf("history after revert = %v", history)
	}
	before := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteHistoryData","id":`+handlerstest.Encode(t, results[0].(map[string]any)["id"])+`}`)
	if title := before["data"].(map[string]any)["title"]; title != "Plan v2" {
		t.Errorf("snapshot before reversal title = %v", title)
	}

	deleted := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"deleteHistoryRecord","id":`+handlerstest.Encode(t, versionID)+`,"note_id":1}`)
	if deleted["type"] != "deleteHistoryRecordResponse" {
		t.Errorf("delete = %v", deleted)
	}
	read()
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteHistoryData","id":`+handlerstest.Encode(t, versionID)+`}`); response["message"] != historyNotFound {
		t.Errorf("deleted version = %v", response)
	}

	other := s.AddUser(t, "other")
	otherConn := s.Dial(t, other)
	if response := handlerstest.Request(t, otherConn, `{"requestId":"r","namespace":"notes","type":"findNoteHistory","note_id":1,"page":1}`); response["message"] != "Note does not exist." {
		t.Errorf("foreign history = %v", response)
	}
}
