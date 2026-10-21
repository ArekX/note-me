package tags

import (
	"context"
	"strings"
	"testing"

	"github.com/coder/websocket"

	"noteme/internal/components"
	"noteme/internal/components/repository"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func newServer(t *testing.T) *handlerstest.Server {
	return handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		return []ws.Namespace{New(c)}
	})
}

func TestTags(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	user := s.AddUser(t, "user")
	userConn := s.Dial(t, user)
	userTab := s.Dial(t, user)

	response := handlerstest.Request(t, userConn, `{"requestId":"r","namespace":"tags","type":"createTag","data":{"name":"work"}}`)
	if response["type"] != "createTagResponse" || handlerstest.Encode(t, response["record"]) != `{"id":1,"name":"work"}` {
		t.Errorf("create = %v", response)
	}
	if other := handlerstest.Read(t, userTab); other["type"] != "createTagResponse" || other["requestId"] != "r" {
		t.Errorf("other tab = %v", other)
	}
	handlerstest.ExpectDataChanged(t, conn, "tag", "[1]")

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"tags","type":"createTag","data":{"name":""}}`); response["message"] != `[{"code":"too_small","path":["name"],"message":"Name must have at least one character"}]` {
		t.Errorf("empty name = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"tags","type":"createTag","data":{"name":"`+strings.Repeat("a", 256)+`"}}`); response["message"] != `[{"code":"too_big","path":["name"],"message":"Name must have at most 255 characters"}]` {
		t.Errorf("long name = %v", response)
	}

	s.CreateNote(t, handlerstest.AdminID, "Plan", nil, "homework")

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"tags","type":"findTags","filters":{"name":"wor"},"page":1}`)
	if got := handlerstest.Encode(t, response["records"]); got != `{"page":1,"per_page":20,"results":[{"id":1,"name":"work"},{"id":2,"name":"homework"}],"total":2}` {
		t.Errorf("find = %s", got)
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"tags","type":"createTag","data":{"name":"work"}}`); response["message"] != "Tag with this name already exists." {
		t.Errorf("duplicate name = %v", response)
	}
}

func TestUpdateAndDeleteTag(t *testing.T) {
	s := newServer(t)
	admin := s.Dial(t, handlerstest.AdminID)
	user := s.Dial(t, s.AddUser(t, "user"))
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil, "work", "home")

	tests := []struct {
		conn    *websocket.Conn
		message string
		want    string
	}{
		{user, `{"requestId":"r","namespace":"tags","type":"updateTag","id":1,"data":{"name":""}}`, `[{"code":"too_small","path":["name"],"message":"Name must have at least one character"}]`},
		{user, `{"requestId":"r","namespace":"tags","type":"updateTag","id":1,"data":{"name":"job"}}`, "User does not have the required permission: canUpdateTags"},
		{user, `{"requestId":"r","namespace":"tags","type":"deleteTag","id":1}`, "User does not have the required permission: canUpdateTags"},
		{admin, `{"requestId":"r","namespace":"tags","type":"updateTag","id":1,"data":{"name":"job","extra":1}}`, `[{"code":"unrecognized_keys","path":[],"message":"Unrecognized key: \"extra\""}]`},
		{admin, `{"requestId":"r","namespace":"tags","type":"updateTag","id":1,"data":{"name":"home"}}`, "Tag with this name already exists."},
	}
	for _, tt := range tests {
		if response := handlerstest.Request(t, tt.conn, tt.message); response["type"] != "error" || response["message"] != tt.want {
			t.Errorf("%s: response = %v", tt.message, response)
		}
	}

	response := handlerstest.Request(t, admin, `{"requestId":"r","namespace":"tags","type":"updateTag","id":1,"data":{"name":"job"}}`)
	if handlerstest.Encode(t, response) != `{"namespace":"tags","requestId":"r","type":"updateTagResponse","updated_data":{"name":"job"},"updated_id":1}` {
		t.Errorf("update = %v", response)
	}
	handlerstest.ExpectDataChanged(t, user, "tag", "[1]")

	response = handlerstest.Request(t, admin, `{"requestId":"r","namespace":"tags","type":"deleteTag","id":1}`)
	if response["type"] != "deleteTagResponse" || response["deleted_id"] != float64(1) {
		t.Errorf("delete = %v", response)
	}
	handlerstest.ExpectDataChanged(t, user, "tag", "[1]")
	found := handlerstest.Request(t, admin, `{"requestId":"r","namespace":"tags","type":"findTags","filters":{"name":""},"page":1}`)
	if got := handlerstest.Encode(t, found["records"]); got != `{"page":1,"per_page":20,"results":[{"id":2,"name":"home"}],"total":1}` {
		t.Errorf("tags after delete = %s", got)
	}

	entries, err := s.C.Repository.AuditLog().FindAuditEntries(context.Background(), repository.AuditFilters{}, 1)
	if err != nil || entries.Total != 2 {
		t.Fatalf("audit entries = %+v, %v", entries, err)
	}
	if got := entries.Results[0]; got.Event != "tag_deleted" || got.Details != `{"id":1,"name":"job"}` || got.Username != "admin" {
		t.Errorf("delete audit = %+v", got)
	}
	if got := entries.Results[1]; got.Event != "tag_updated" || got.Details != `{"id":1,"name":"job"}` {
		t.Errorf("update audit = %+v", got)
	}
}

func TestTagChangesReachEveryTab(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	tab := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil, "work")

	for _, step := range []struct{ message, want string }{
		{`"type":"updateTag","id":1,"data":{"name":"job"}`, "updateTagResponse"},
		{`"type":"deleteTag","id":1`, "deleteTagResponse"},
	} {
		if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"tags",`+step.message+`}`); response["type"] != step.want {
			t.Errorf("%s = %v", step.message, response)
		}
		handlerstest.ExpectType(t, tab, step.want)
	}
}
