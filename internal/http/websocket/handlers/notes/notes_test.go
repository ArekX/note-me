package notes

import (
	"context"
	"strings"
	"testing"

	"noteme/internal/components"
	"noteme/internal/components/repository"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/handlerstest"
	"noteme/internal/http/websocket/handlers/tree"
)

func newServer(t *testing.T) *handlerstest.Server {
	return handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		return []ws.Namespace{New(c), tree.New(c)}
	})
}

func TestCreateNote(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	otherTab := s.Dial(t, handlerstest.AdminID)

	group, err := s.C.Repository.Groups().CreateGroup(context.Background(), repository.NewGroupRecord{Name: "Work", UserId: handlerstest.AdminID})
	if err != nil {
		t.Fatal(err)
	}

	response := handlerstest.Request(t, conn, `{"requestId":"r1","namespace":"notes","type":"createNote","data":{"title":"Plan","text":"# Hi","is_encrypted":false,"tags":["Work","todo"],"group_id":1}}`)
	record := response["record"].(map[string]any)
	if response["requestId"] != "r1" || response["type"] != "createNoteResponse" || response["group_id"] != float64(group.Id) || record["title"] != "Plan" || record["note"] != "# Hi" || record["last_open_at"] != nil {
		t.Errorf("response = %v", response)
	}
	if pushed := handlerstest.Read(t, otherTab); pushed["type"] != "createNoteResponse" {
		t.Errorf("other tab got %v", pushed)
	}

	note := handlerstest.Request(t, conn, `{"requestId":"r2","namespace":"notes","type":"getNote","id":1}`)
	if got := handlerstest.Encode(t, note["record"]); got != `{"group_id":1,"group_name":"Work","id":1,"is_encrypted":false,"is_wide":false,"note":"# Hi","tags":["todo","work"],"title":"Plan","updated_at":`+handlerstest.Encode(t, record["updated_at"])+`}` &&
		got != `{"group_id":1,"group_name":"Work","id":1,"is_encrypted":false,"is_wide":false,"note":"# Hi","tags":["work","todo"],"title":"Plan","updated_at":`+handlerstest.Encode(t, record["updated_at"])+`}` {
		t.Errorf("note = %s", got)
	}

	tree := handlerstest.Request(t, conn, `{"requestId":"r3","namespace":"tree","type":"getTree","parent_id":1}`)
	if got := handlerstest.Encode(t, tree["records"]); got != `[{"has_children":0,"id":1,"is_encrypted":0,"name":"Plan","type":"note"}]` {
		t.Errorf("tree = %s", got)
	}
}

func TestCreateNoteValidation(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	other := s.AddUser(t, "other")
	if _, err := s.C.Repository.Groups().CreateGroup(context.Background(), repository.NewGroupRecord{Name: "Theirs", UserId: other}); err != nil {
		t.Fatal(err)
	}

	tooManyTags := `["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u"]`
	tests := map[string]string{
		`{"title":"","text":"","is_encrypted":false,"tags":[],"group_id":null}`:                   `[{"code":"too_small","path":["title"],"message":"Title must have at least one character"}]`,
		`{"title":"a","text":"","is_encrypted":false,"tags":` + tooManyTags + `,"group_id":null}`: `[{"code":"too_big","path":["tags"],"message":"Note can have at most 20 tags"}]`,
		`{"title":"a","text":"","is_encrypted":false,"tags":[]}`:                                  `[{"code":"invalid_type","path":["group_id"],"message":"Invalid input: expected number, received undefined"}]`,
		`{"title":"a","text":"","is_encrypted":false,"tags":[],"group_id":1}`:                     `Group does not exist!`,
	}
	for data, want := range tests {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"createNote","data":`+data+`}`)
		if response["type"] != "error" || response["message"] != want {
			t.Errorf("data %s: response = %v", data, response)
		}
	}

	var notes int
	if err := s.C.DB.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM "note"`).Scan(&notes); err != nil || notes != 0 {
		t.Errorf("notes after failed creates = %d, %v", notes, err)
	}
}

func TestUpdateNote(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	ctx := context.Background()

	group, err := s.C.Repository.Groups().CreateGroup(ctx, repository.NewGroupRecord{Name: "Work", UserId: handlerstest.AdminID})
	if err != nil {
		t.Fatal(err)
	}
	id := s.CreateNote(t, handlerstest.AdminID, "Plan", &group.Id, "old")

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{"title":"New","text":"","tags":[],"group_id":null}}`)
	if response["type"] != "updateNoteResponse" || handlerstest.Encode(t, response["updated_data"]) != `{"group_id":null,"tags":[],"text":"","title":"New"}` {
		t.Errorf("response = %v", response)
	}

	note, err := s.C.Repository.Notes().GetNote(ctx, handlerstest.AdminID, id)
	if err != nil {
		t.Fatal(err)
	}
	if note.Title != "New" || note.Note != "" || note.GroupId != nil || len(note.Tags) != 0 {
		t.Errorf("note = %+v", note)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{"group_id":1}}`)
	if handlerstest.Encode(t, response["updated_data"]) != `{"group_id":1}` {
		t.Errorf("move response = %v", response)
	}
	if note, _ := s.C.Repository.Notes().GetNote(ctx, handlerstest.AdminID, id); note.GroupId == nil || note.Title != "New" {
		t.Errorf("moved note = %+v", note)
	}
}

func TestUpdateNoteErrors(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	other := s.AddUser(t, "other")
	s.CreateNote(t, other, "Theirs", nil)
	s.CreateNote(t, handlerstest.AdminID, "Mine", nil)

	tests := []struct {
		message string
		want    string
	}{
		{`{"id":1,"data":{"title":"Taken"}}`, `Note does not exist.`},
		{`{"id":2,"data":{"title":""}}`, `[{"code":"too_small","path":["title"],"message":"Title must have at least one character"}]`},
		{`{"id":2,"data":{"tags":null}}`, `[{"code":"invalid_type","path":["tags"],"message":"Invalid input: expected array, received null"}]`},
		{`{"id":2,"data":{"group_id":"1"}}`, `[{"code":"invalid_type","path":["group_id"],"message":"Invalid input: expected number, received string"}]`},
		{`{"id":2,"data":{"group_id":9}}`, `Group does not exist!`},
		{`{"id":2,"data":{"user_id":1}}`, `[{"code":"unrecognized_keys","path":[],"message":"Unrecognized key: \"user_id\""}]`},
	}
	for _, tt := range tests {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote",`+tt.message[1:])
		if response["type"] != "error" || response["message"] != tt.want {
			t.Errorf("%s: response = %v", tt.message, response)
		}
	}

	if note, _ := s.C.Repository.Notes().GetNote(context.Background(), other, 1); note.Title != "Theirs" {
		t.Errorf("foreign note changed: %+v", note)
	}
}

func TestDeleteNote(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	otherTab := s.Dial(t, handlerstest.AdminID)
	other := s.AddUser(t, "other")
	s.CreateNote(t, other, "Theirs", nil)
	s.CreateNote(t, handlerstest.AdminID, "Mine", nil)

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"deleteNote","id":1}`); response["message"] != "Note does not exist." {
		t.Errorf("foreign delete = %v", response)
	}

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"deleteNote","id":2}`)
	if response["type"] != "deleteNoteResponse" || response["deleted_id"] != float64(2) {
		t.Errorf("response = %v", response)
	}
	if pushed := handlerstest.Read(t, otherTab); pushed["type"] != "deleteNoteResponse" {
		t.Errorf("other tab got %v", pushed)
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNote","id":2}`); response["message"] != "Requested note not found." {
		t.Errorf("deleted note = %v", response)
	}
}

func TestGetNoteMarksOpened(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)

	recent := func() any {
		t.Helper()
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getRecentlyOpenedNotes"}`)
		return response["records"].([]any)[0].(map[string]any)["last_open_at"]
	}

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNote","id":1}`)
	if got := recent(); got != nil {
		t.Errorf("last_open_at without mark_opened = %v", got)
	}

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNote","id":1,"mark_opened":true}`)
	if got := recent(); got == nil {
		t.Error("last_open_at not set")
	}
}

func TestGetNoteDetails(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	other := s.AddUser(t, "other")
	s.CreateNote(t, other, "Theirs", nil)
	s.CreateNote(t, handlerstest.AdminID, "Mine", nil)

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteDetails","id":1,"options":{}}`); response["message"] != "Note does not exist." {
		t.Errorf("foreign details = %v", response)
	}

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteDetails","id":2,"options":{"include_group":true,"include_title":true}}`)
	record := response["record"].(map[string]any)
	if response["type"] != "getNoteDetailsResponse" || record["title"] != "Mine" || record["group_id"] != nil || record["note"] != "" || record["created_at"] != float64(0) {
		t.Errorf("response = %v", response)
	}
}

func TestSearchNote(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	other := s.AddUser(t, "other")
	group, err := s.C.Repository.Groups().CreateGroup(context.Background(), repository.NewGroupRecord{Name: "Work", UserId: handlerstest.AdminID})
	if err != nil {
		t.Fatal(err)
	}
	s.CreateNote(t, handlerstest.AdminID, "Plan", &group.Id, "todo")
	s.CreateNote(t, handlerstest.AdminID, "Loose plan", nil)
	s.CreateNote(t, other, "Their plan", nil)

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"searchNote","filters":{"query":"plan","type":"general"}}`)
	results := response["results"].([]any)
	if response["type"] != "searchNoteResponse" || len(results) != 2 {
		t.Fatalf("response = %v", response)
	}
	first := results[0].(map[string]any)
	second := results[1].(map[string]any)
	if got := handlerstest.Encode(t, second); got != `{"group_name":null,"id":2,"is_encrypted":false,"note":"text","title":"Loose plan","updated_at":`+handlerstest.Encode(t, second["updated_at"])+`,"user_name":"Administrator"}` {
		t.Errorf("root result = %s", got)
	}
	if first["group_name"] != "Work" {
		t.Errorf("group result = %v", first)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"searchNote","filters":{"query":"","group_id":1,"tags":["todo"],"from_id":0,"type":"general"}}`)
	if results := response["results"].([]any); len(results) != 1 || results[0].(map[string]any)["title"] != "Plan" {
		t.Errorf("filtered = %v", results)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"searchNote","filters":{"query":"plan","type":"unknown"}}`)
	if got := handlerstest.Encode(t, response["results"]); got != "[]" {
		t.Errorf("unknown type = %s", got)
	}
}

func TestUpdateNoteSavesProtectionWithoutText(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	id := s.CreateNote(t, handlerstest.AdminID, "Plan", nil)

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{"is_encrypted":true}}`)

	note, err := s.C.Repository.Notes().GetNote(context.Background(), handlerstest.AdminID, id)
	if err != nil || !note.IsEncrypted || note.Note != "text" {
		t.Errorf("note = %+v, %v", note, err)
	}
}

func TestNoteWidth(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"createNote","data":{"title":"Narrow","text":"","is_encrypted":false,"tags":[],"group_id":null}}`)
	narrowID := int64(response["record"].(map[string]any)["id"].(float64))
	if response["record"].(map[string]any)["is_wide"] != false {
		t.Errorf("note created without a width = %v", response)
	}
	chosen := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"createNote","data":{"title":"Chosen","text":"","is_encrypted":false,"is_wide":true,"tags":[],"group_id":null}}`)
	if chosen["record"].(map[string]any)["is_wide"] != true {
		t.Errorf("note created wide = %v", chosen)
	}
	wideID := s.CreateNote(t, handlerstest.AdminID, "Wide", nil)
	if note, _ := s.C.Repository.Notes().GetNote(ctx, handlerstest.AdminID, narrowID); note.IsWide {
		t.Errorf("narrow note = %+v", note)
	}

	before, err := s.C.Repository.Notes().GetNote(ctx, handlerstest.AdminID, wideID)
	if err != nil || !before.IsWide {
		t.Fatalf("wide note = %+v, %v", before, err)
	}
	if _, err := s.C.DB.ExecContext(ctx, `UPDATE "note" SET "updated_at" = 100 WHERE "id" = ?`, wideID); err != nil {
		t.Fatal(err)
	}
	updated := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":`+handlerstest.Encode(t, wideID)+`,"data":{"is_wide":false}}`)
	if updated["type"] != "updateNoteResponse" || handlerstest.Encode(t, updated["updated_data"]) != `{"is_wide":false}` {
		t.Errorf("width update = %v", updated)
	}

	after, err := s.C.Repository.Notes().GetNote(ctx, handlerstest.AdminID, wideID)
	if err != nil || after.IsWide || after.UpdatedAt != 100 {
		t.Errorf("after width change = %+v, %v", after, err)
	}
	history, err := s.C.Repository.NoteHistory().FindHistory(ctx, handlerstest.AdminID, wideID, 1)
	if err != nil || history.Total != 0 {
		t.Errorf("history after width change = %+v, %v", history, err)
	}
}

func TestNoteSizeLimits(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)

	longTitle := strings.Repeat("a", 256)
	tooLong := `[{"code":"too_big","path":["title"],"message":"Title must have at most 255 characters"}]`
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"createNote","data":{"title":"`+longTitle+`","text":"","is_encrypted":false,"tags":[],"group_id":null}}`); response["message"] != tooLong {
		t.Errorf("create with long title = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{"title":"`+longTitle+`"}}`); response["message"] != tooLong {
		t.Errorf("update with long title = %v", response)
	}

	tags := "[" + strings.TrimSuffix(strings.Repeat(`"t",`, 21), ",") + "]"
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"searchNote","filters":{"type":"general","tags":`+tags+`}}`); response["message"] != `[{"code":"too_big","path":["filters","tags"],"message":"Too big: expected array to have <=20 items"}]` {
		t.Errorf("search with too many tags = %v", response)
	}
}
