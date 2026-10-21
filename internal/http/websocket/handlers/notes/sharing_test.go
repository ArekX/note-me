package notes

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"noteme/internal/eventbus"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func TestShareToUsers(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	reader := s.AddUser(t, "reader")
	readerConn := s.Dial(t, reader)
	other := s.AddUser(t, "other")
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)

	created := make(chan eventbus.NotificationCreated, 4)
	s.C.Bus.Subscribe(func(_ context.Context, e eventbus.NotificationCreated) { created <- e })

	if response := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"shareToUsers","note_id":1,"user_ids":[2]}`); response["message"] != "Note does not exist." {
		t.Errorf("foreign share = %v", response)
	}

	share := func(ids string) {
		t.Helper()
		if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"shareToUsers","note_id":1,"user_ids":`+ids+`}`); response["type"] != "shareToUsersResponse" {
			t.Fatalf("share %s = %v", ids, response)
		}
	}
	share(handlerstest.Encode(t, []int{reader}))
	share(handlerstest.Encode(t, []int{reader, other}))
	handlerstest.ExpectDataChanged(t, readerConn, "share", "[1]")
	handlerstest.ExpectDataChanged(t, readerConn, "share", "[1]")

	// The response goes out before the notifications are created.
	events := []eventbus.NotificationCreated{}
	for range 2 {
		select {
		case e := <-created:
			events = append(events, e)
		case <-time.After(5 * time.Second):
			t.Fatalf("events = %+v", events)
		}
	}
	if events[0].UserID != reader || events[1].UserID != other {
		t.Fatalf("events = %+v", events)
	}
	var data map[string]any
	if err := json.Unmarshal([]byte(events[0].Data), &data); err != nil {
		t.Fatal(err)
	}
	if handlerstest.Encode(t, data) != `{"payload":{"id":1,"title":"Plan","user_name":"Administrator"},"type":"note-shared"}` {
		t.Errorf("notification data = %s", events[0].Data)
	}

	shareData := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteShareData","note_id":1}`)
	if users := shareData["users"].([]any); len(users) != 2 || shareData["links"] == nil {
		t.Errorf("share data = %v", shareData)
	}

	found := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"findSharedNotes","filters":{"limit":5}}`)
	if records := found["records"].([]any); len(records) != 1 || records[0].(map[string]any)["user_name"] != "Administrator" {
		t.Errorf("shared notes = %v", found)
	}
	search := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"searchNote","filters":{"query":"pla","type":"shared"}}`)
	if results := search["results"].([]any); len(results) != 1 {
		t.Errorf("shared search = %v", search)
	}

	sharedNote := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"getSharedNote","id":1}`)
	if got := handlerstest.Encode(t, sharedNote["record"]); got != `{"id":1,"is_encrypted":false,"is_wide":true,"note":"text","tags":[],"title":"Plan","updated_at":`+handlerstest.Encode(t, sharedNote["record"].(map[string]any)["updated_at"])+`,"user_name":"Administrator"}` {
		t.Errorf("shared note = %s", got)
	}

	reminder := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"setReminder","note_id":1,"reminder":{"type":"once","next_at":1800000000}}`)
	if reminder["type"] != "setReminderResponse" {
		t.Errorf("reminder on shared note = %v", reminder)
	}

	if _, err := s.C.DB.ExecContext(context.Background(), `UPDATE "note" SET "is_encrypted" = true`); err != nil {
		t.Fatal(err)
	}
	if response := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"getSharedNote","id":1}`); response["message"] != "This note is protected by its owner and cannot be viewed." {
		t.Errorf("protected shared note = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getSharedNote","id":1}`); response["message"] != "Requested note not found." {
		t.Errorf("owner's shared view = %v", response)
	}
}

func TestPublicShareLinks(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)

	created := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"createPublicShare","note_id":1,"expires_at":null}`)
	record := created["record"].(map[string]any)
	if created["type"] != "createPublicShareResponse" || record["expires_at"] != nil || len(record["identifier"].(string)) != 36 {
		t.Fatalf("create = %v", created)
	}

	removed := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"removePublicShare","note_id":1,"id":`+handlerstest.Encode(t, record["id"])+`}`)
	if removed["type"] != "removePublicShareResponse" || removed["removed_id"] != record["id"] {
		t.Errorf("remove = %v", removed)
	}
	if links := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteShareData","note_id":1}`)["links"].([]any); len(links) != 0 {
		t.Errorf("links after remove = %v", links)
	}
}

func TestProtectedNotesAreNotShared(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	reader := s.AddUser(t, "reader")
	readerConn := s.Dial(t, reader)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)
	ctx := context.Background()

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"shareToUsers","note_id":1,"user_ids":`+handlerstest.Encode(t, []int{reader})+`}`); response["type"] != "shareToUsersResponse" {
		t.Fatalf("share = %v", response)
	}
	handlerstest.ExpectDataChanged(t, readerConn, "share", "[1]")
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"createPublicShare","note_id":1,"expires_at":null}`); response["type"] != "createPublicShareResponse" {
		t.Fatalf("link = %v", response)
	}
	if response := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"setReminder","note_id":1,"reminder":{"type":"once","next_at":`+handlerstest.Encode(t, time.Now().Unix()+3600)+`}}`); response["type"] != "setReminderResponse" {
		t.Fatalf("reader reminder = %v", response)
	}
	if _, err := s.C.Repository.Notifications().CreateNotification(ctx, reader, `{"type":"note-shared","payload":{"id":1}}`); err != nil {
		t.Fatal(err)
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{"is_encrypted":true}}`); response["type"] != "updateNoteResponse" {
		t.Fatalf("protect = %v", response)
	}
	handlerstest.ExpectDataChanged(t, readerConn, "note", "[1]")
	shareData := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteShareData","note_id":1}`)
	if users, links := shareData["users"].([]any), shareData["links"].([]any); len(users) != 0 || len(links) != 0 {
		t.Errorf("shares after protecting = %v", shareData)
	}
	if data := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"getNoteReminderData","note_id":1}`); data["data"] != nil {
		t.Errorf("reader reminder after protecting = %v", data)
	}
	if list, _ := s.C.Repository.Notifications().GetUserNotifications(ctx, reader); len(list) != 0 {
		t.Errorf("reader notifications after protecting = %+v", list)
	}
	if response := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"getNoteDetails","id":1,"options":{"include_note":true}}`); response["message"] != "Note does not exist." {
		t.Errorf("reader details after protecting = %v", response)
	}

	for _, message := range []string{
		`{"requestId":"r","namespace":"notes","type":"shareToUsers","note_id":1,"user_ids":` + handlerstest.Encode(t, []int{reader}) + `}`,
		`{"requestId":"r","namespace":"notes","type":"createPublicShare","note_id":1,"expires_at":null}`,
	} {
		if response := handlerstest.Request(t, conn, message); response["message"] != protectedNoteShare {
			t.Errorf("%s: %v", message, response)
		}
	}

	// A share row that somehow exists still never carries the text.
	if _, err := s.C.DB.ExecContext(ctx, `INSERT INTO "note_share_user" ("note_id", "user_id", "created_at") VALUES (1, ?, 0)`, reader); err != nil {
		t.Fatal(err)
	}
	details := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"getNoteDetails","id":1,"options":{"include_note":true,"include_title":true}}`)
	if record, _ := details["record"].(map[string]any); record == nil || record["note"] != "" || record["title"] != "Plan" {
		t.Errorf("reader details with a stray share = %v", details)
	}
	owner := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"getNoteDetails","id":1,"options":{"include_note":true}}`)
	if record, _ := owner["record"].(map[string]any); record == nil || record["note"] != "text" {
		t.Errorf("owner details = %v", owner)
	}
}

func TestRevertToProtectedVersionRemovesShares(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	reader := s.AddUser(t, "reader")
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)
	ctx := context.Background()

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{"is_encrypted":true,"text":"cipher"}}`)
	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"updateNote","id":1,"data":{"is_encrypted":false,"text":"plain"}}`)
	if _, err := s.C.Repository.Shares().SetUserShare(ctx, handlerstest.AdminID, 1, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}
	history := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"findNoteHistory","note_id":1,"page":1}`)
	versions := history["records"].(map[string]any)["results"].([]any)
	var protectedVersion any
	for _, version := range versions {
		if version.(map[string]any)["is_encrypted"] == true {
			protectedVersion = version.(map[string]any)["id"]
		}
	}
	if protectedVersion == nil {
		t.Fatalf("no protected version in %v", versions)
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"revertNoteToHistory","note_id":1,"to_history_id":`+handlerstest.Encode(t, protectedVersion)+`}`); response["type"] != "revertNoteToHistoryResponse" {
		t.Fatalf("revert = %v", response)
	}
	if shared, _ := s.C.Repository.Shares().SharedNoteWithUser(ctx, reader, 1); shared {
		t.Error("share kept after reverting to a protected version")
	}
}

func TestRevokedShareRemovesReminderAndNotifications(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	reader := s.AddUser(t, "reader")
	readerConn := s.Dial(t, reader)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)
	ctx := context.Background()

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"shareToUsers","note_id":1,"user_ids":`+handlerstest.Encode(t, []int{reader})+`}`)
	handlerstest.ExpectDataChanged(t, readerConn, "share", "[1]")
	if response := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"setReminder","note_id":1,"reminder":{"type":"once","next_at":`+handlerstest.Encode(t, time.Now().Unix()+3600)+`}}`); response["type"] != "setReminderResponse" {
		t.Fatalf("reader reminder = %v", response)
	}
	if _, err := s.C.Repository.Notifications().CreateNotification(ctx, reader, `{"type":"note-shared","payload":{"id":1}}`); err != nil {
		t.Fatal(err)
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"shareToUsers","note_id":1,"user_ids":[]}`); response["type"] != "shareToUsersResponse" {
		t.Fatalf("revoke = %v", response)
	}
	handlerstest.ExpectDataChanged(t, readerConn, "share", "[1]")
	if data := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"getNoteReminderData","note_id":1}`); data["data"] != nil {
		t.Errorf("reader reminder after revoke = %v", data)
	}
	if found := handlerstest.Request(t, readerConn, `{"requestId":"r","namespace":"notes","type":"findNoteReminders","filters":{}}`); len(found["records"].([]any)) != 0 {
		t.Errorf("reader reminders after revoke = %v", found)
	}
	if list, _ := s.C.Repository.Notifications().GetUserNotifications(ctx, reader); len(list) != 0 {
		t.Errorf("reader notifications after revoke = %+v", list)
	}
	if _, err := s.C.Repository.Shares().SetUserShare(ctx, handlerstest.AdminID, 1, []int64{int64(reader)}); err != nil {
		t.Fatal(err)
	}
	if data, _ := s.C.Repository.Reminders().GetNoteReminderData(ctx, reader, 1); data != nil {
		t.Errorf("reminder came back with the share: %+v", data)
	}
}

func TestShareToUsersLimit(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	s.CreateNote(t, handlerstest.AdminID, "Plan", nil)

	ids := "[" + strings.TrimSuffix(strings.Repeat("2,", 101), ",") + "]"
	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notes","type":"shareToUsers","note_id":1,"user_ids":`+ids+`}`)
	if response["message"] != `[{"code":"too_big","path":["user_ids"],"message":"Too big: expected array to have <=100 items"}]` {
		t.Errorf("too many recipients = %v", response)
	}
}
