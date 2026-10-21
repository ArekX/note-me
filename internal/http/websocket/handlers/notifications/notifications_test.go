package notifications

import (
	"context"
	"encoding/json"
	"testing"

	"noteme/internal/components"
	"noteme/internal/eventbus"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func newServer(t *testing.T) *handlerstest.Server {
	return handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		return []ws.Namespace{New(c)}
	})
}

const reminderData = `{"type":"reminder-received","payload":{"id":1,"reminder_id":2,"title":"Plan","is_encrypted":false,"user_id":1,"user_name":"Administrator","type":"own"}}`

// Re-encodes JSON the way handlerstest.Encode orders keys.
func sorted(t *testing.T, data string) string {
	var value any
	if err := json.Unmarshal([]byte(data), &value); err != nil {
		t.Fatal(err)
	}
	return handlerstest.Encode(t, value)
}

func TestNotificationHandlers(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	ctx := context.Background()
	first, err := s.C.Repository.Notifications().CreateNotification(ctx, handlerstest.AdminID, reminderData)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.C.Repository.Notifications().CreateNotification(ctx, handlerstest.AdminID, reminderData); err != nil {
		t.Fatal(err)
	}

	list := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notifications","type":"getMyNotifications"}`)
	records := list["records"].([]any)
	if list["type"] != "notificationsList" || len(records) != 2 {
		t.Fatalf("list = %v", list)
	}
	if got := handlerstest.Encode(t, records[1]); got != `{"created_at":`+handlerstest.Encode(t, first.CreatedAt)+`,"data":`+sorted(t, reminderData)+`,"id":1,"is_read":false,"user_id":1}` {
		t.Errorf("record = %s", got)
	}

	tab := s.Dial(t, handlerstest.AdminID)
	for message, want := range map[string]string{
		`"type":"markSingleRead","id":1`: "markedSingleRead",
		`"type":"markAllRead"`:           "markedAllRead",
		`"type":"deleteSingle","id":1`:   "deletedSingle",
	} {
		if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notifications",`+message+`}`); response["type"] != want {
			t.Errorf("%s: response = %v", message, response)
		}
		if other := handlerstest.Read(t, tab); other["type"] != want {
			t.Errorf("%s: other tab = %v", message, other)
		}
	}

	list = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notifications","type":"getMyNotifications"}`)
	if records := list["records"].([]any); len(records) != 1 || records[0].(map[string]any)["is_read"] != true {
		t.Errorf("after read and delete = %v", list)
	}

	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notifications","type":"deleteAll"}`)
	if list := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notifications","type":"getMyNotifications"}`); len(list["records"].([]any)) != 0 {
		t.Errorf("after delete all = %v", list)
	}
}

func TestNotificationCreatedReachesTheUser(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	// The connection is registered once it has answered a request.
	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"notifications","type":"getMyNotifications"}`)

	s.C.Bus.Publish(context.Background(), eventbus.NotificationCreated{ID: 9, UserID: handlerstest.AdminID, Data: reminderData, CreatedAt: 100})

	pushed := handlerstest.Read(t, conn)
	if pushed["namespace"] != "notifications" || pushed["type"] != "notificationAdded" {
		t.Fatalf("pushed = %v", pushed)
	}
	if got := handlerstest.Encode(t, pushed["record"]); got != `{"created_at":100,"data":`+sorted(t, reminderData)+`,"id":9,"is_read":false,"user_id":1}` {
		t.Errorf("record = %s", got)
	}
}
