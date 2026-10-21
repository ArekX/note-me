package groups

import (
	"context"
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

func TestCreateGroup(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	otherTab := s.Dial(t, handlerstest.AdminID)

	response := handlerstest.Request(t, conn, `{"requestId":"r1","namespace":"groups","type":"createGroup","data":{"name":"Work","parent_id":null}}`)
	record := response["record"].(map[string]any)
	if response["requestId"] != "r1" || response["type"] != "createGroupResponse" || record["name"] != "Work" || record["parent_id"] != nil {
		t.Errorf("response = %v", response)
	}

	if pushed := handlerstest.Read(t, otherTab); pushed["type"] != "createGroupResponse" || pushed["namespace"] != "groups" {
		t.Errorf("other tab got %v", pushed)
	}

	tree := handlerstest.Request(t, conn, `{"requestId":"r2","namespace":"tree","type":"getTree"}`)
	if got := handlerstest.Encode(t, tree["records"]); got != `[{"has_children":0,"id":1,"is_encrypted":0,"name":"Work","type":"group"}]` {
		t.Errorf("tree = %s", got)
	}
}

func TestCreateGroupValidation(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)

	tests := map[string]string{
		`{}`:                           `[{"code":"invalid_type","path":["name"],"message":"Name is required"},{"code":"invalid_type","path":["parent_id"],"message":"Parent ID is required"}]`,
		`{"name":"","parent_id":null}`: `[{"code":"too_small","path":["name"],"message":"Group name must be at least 1 character long"}]`,
		`{"name":"a","parent_id":5}`:   `Group does not exist!`,
	}
	for data, want := range tests {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"groups","type":"createGroup","data":`+data+`}`)
		if response["type"] != "error" || response["message"] != want {
			t.Errorf("data %s: response = %v", data, response)
		}
	}
}

func TestUpdateGroup(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	ctx := context.Background()

	parent, err := s.C.Repository.Groups().CreateGroup(ctx, repository.NewGroupRecord{Name: "Parent", UserId: handlerstest.AdminID})
	if err != nil {
		t.Fatal(err)
	}
	child, err := s.C.Repository.Groups().CreateGroup(ctx, repository.NewGroupRecord{Name: "Child", ParentId: &parent.Id, UserId: handlerstest.AdminID})
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		message string
		want    string
	}{
		{`{"id":1,"data":{"parent_id":1}}`, `Group cannot be its own parent`},
		{`{"id":1,"data":{"parent_id":2}}`, `Group cannot be moved into its own subgroup`},
		{`{"id":1,"data":{"name":null}}`, `[{"code":"invalid_type","path":["name"],"message":"Name is required"}]`},
		{`{"id":1,"data":{"color":"red"}}`, `[{"code":"unrecognized_keys","path":[],"message":"Unrecognized key: \"color\""}]`},
	}
	for _, tt := range tests {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"groups","type":"updateGroup",`+tt.message[1:])
		if response["type"] != "error" || response["message"] != tt.want {
			t.Errorf("%s: response = %v", tt.message, response)
		}
	}

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"groups","type":"updateGroup","id":2,"data":{"name":"Moved","parent_id":null}}`)
	if response["type"] != "updateGroupResponse" || handlerstest.Encode(t, response["updated_data"]) != `{"name":"Moved","parent_id":null}` {
		t.Errorf("move to top level = %v", response)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"groups","type":"updateGroup","id":2,"data":{"name":"Renamed"}}`)
	if handlerstest.Encode(t, response["updated_data"]) != `{"name":"Renamed"}` {
		t.Errorf("rename echoed parent_id: %v", response)
	}

	record, err := s.C.Repository.Groups().GetGroupById(ctx, handlerstest.AdminID, child.Id)
	if err != nil || record.Name != "Renamed" || record.ParentId != nil {
		t.Errorf("child = %+v, %v", record, err)
	}
}

func TestGroupsAreScopedToTheUser(t *testing.T) {
	s := newServer(t)
	other := s.AddUser(t, "jane")
	ctx := context.Background()

	if _, err := s.C.Repository.Groups().CreateGroup(ctx, repository.NewGroupRecord{Name: "Private", UserId: handlerstest.AdminID}); err != nil {
		t.Fatal(err)
	}

	conn := s.Dial(t, other)

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"groups","type":"getSingleGroup","id":1}`); response["record"] != nil {
		t.Errorf("getSingleGroup = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"groups","type":"deleteGroup","id":1}`); response["message"] != "Group does not exist!" {
		t.Errorf("deleteGroup = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"groups","type":"updateGroup","id":1,"data":{"name":"Mine"}}`); response["message"] != "Group does not exist!" {
		t.Errorf("updateGroup = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"tree","type":"getTree"}`); handlerstest.Encode(t, response["records"]) != `[]` {
		t.Errorf("getTree = %v", response)
	}

	if exists, _ := s.C.Repository.Groups().GroupExists(ctx, handlerstest.AdminID, 1); !exists {
		t.Error("another user deleted the group")
	}
}

func TestDeleteGroup(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	ctx := context.Background()
	repo := s.C.Repository

	root, _ := repo.Groups().CreateGroup(ctx, repository.NewGroupRecord{Name: "Root", UserId: handlerstest.AdminID})
	child, _ := repo.Groups().CreateGroup(ctx, repository.NewGroupRecord{Name: "Child", ParentId: &root.Id, UserId: handlerstest.AdminID})
	if _, err := repo.Groups().CreateGroup(ctx, repository.NewGroupRecord{Name: "Grandchild", ParentId: &child.Id, UserId: handlerstest.AdminID}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.C.DB.ExecContext(ctx, `INSERT INTO "note" ("title", "note", "user_id", "created_at", "updated_at") VALUES ('Note', '', 1, 0, 0)`); err != nil {
		t.Fatal(err)
	}
	if _, err := s.C.DB.ExecContext(ctx, `INSERT INTO "group_note" ("group_id", "note_id", "user_id") VALUES (1, 1, 1)`); err != nil {
		t.Fatal(err)
	}

	handlerstest.Send(t, conn, `{"requestId":"del","namespace":"groups","type":"deleteGroup","id":1}`)

	want := []string{
		"notes/deleteNoteResponse 1",
		"groups/deleteGroupResponse 2",
		"groups/deleteGroupProgress 2",
		"groups/deleteGroupResponse 3",
		"groups/deleteGroupProgress 3",
		"groups/deleteGroupProgress 3",
		"groups/deleteGroupResponse 1",
	}
	for index, expected := range want {
		msg := handlerstest.Read(t, conn)
		got := msg["namespace"].(string) + "/" + msg["type"].(string) + " "
		if msg["type"] == "deleteGroupProgress" {
			got += handlerstest.Encode(t, msg["deleted_count"])
		} else {
			got += handlerstest.Encode(t, msg["deleted_id"])
		}
		if got != expected {
			t.Errorf("message %d = %s, want %s", index, got, expected)
		}
		if index == len(want)-1 && msg["requestId"] != "del" {
			t.Errorf("final response request id = %v", msg["requestId"])
		}
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"tree","type":"getTree"}`); handlerstest.Encode(t, response["records"]) != `[]` {
		t.Errorf("tree after delete = %v", response)
	}
}

func TestDeleteGroupReachesRecipientsOfItsNotes(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)
	reader := s.AddUser(t, "reader")
	readerConn := s.Dial(t, reader)
	group, err := s.C.Repository.Groups().CreateGroup(ctx, repository.NewGroupRecord{Name: "Work", UserId: handlerstest.AdminID})
	if err != nil {
		t.Fatal(err)
	}
	shared := s.CreateNote(t, handlerstest.AdminID, "Shared", &group.Id)
	s.CreateNote(t, handlerstest.AdminID, "Private", &group.Id)
	later := s.CreateNote(t, handlerstest.AdminID, "Later", &group.Id)
	if _, err := s.C.Repository.Shares().SetUserShare(ctx, handlerstest.AdminID, later, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.C.Repository.Shares().SetUserShare(ctx, handlerstest.AdminID, shared, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}

	handlerstest.Send(t, conn, `{"requestId":"del","namespace":"groups","type":"deleteGroup","id":`+handlerstest.Encode(t, group.Id)+`}`)
	handlerstest.ExpectDataChanged(t, readerConn, "note", "["+handlerstest.Encode(t, shared)+"]")
	handlerstest.ExpectDataChanged(t, readerConn, "note", "["+handlerstest.Encode(t, later)+"]")
}
