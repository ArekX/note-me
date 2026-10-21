package changes

import (
	"context"
	"testing"

	"github.com/coder/websocket"

	"noteme/internal/components"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/handlerstest"
	"noteme/internal/http/websocket/messages"
)

type hubNamespace struct {
	hub *ws.Hub
}

func (n *hubNamespace) Register(hub *ws.Hub) {
	n.hub = hub
}

func expectNothingElse(t *testing.T, conn *websocket.Conn) {
	t.Helper()
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"none","type":"none"}`); response["message"] != "No handler found" {
		t.Errorf("unexpected message %v", response)
	}
}

func TestNotifyDataChanged(t *testing.T) {
	ns := &hubNamespace{}
	s := handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		return []ws.Namespace{New(c), ns}
	})
	ctx := context.Background()
	admin := s.Dial(t, handlerstest.AdminID)
	first := s.AddUser(t, "first")
	firstTabs := []*websocket.Conn{s.Dial(t, first), s.Dial(t, first)}
	second := s.Dial(t, s.AddUser(t, "second"))

	ns.hub.PushBackend(ctx, &messages.NotifyDataChanged{
		Header:  messages.Header{Namespace: messages.NamespaceChanges, Type: messages.ChangesNotifyDataChanged},
		UserIDs: []int{first, 999},
		Entity:  messages.EntityReminder,
		IDs:     []any{3},
	})
	ns.hub.PushBackend(ctx, &messages.NotifyDataChanged{
		Header:     messages.Header{Namespace: messages.NamespaceChanges, Type: messages.ChangesNotifyDataChanged},
		Permission: "canManageBackups",
		Entity:     messages.EntityBackup,
		IDs:        []any{"manual-1"},
	})
	ns.hub.SendToEveryone(ctx, first, messages.NewDataChanged(messages.EntityTag, int64(7)))

	for _, tab := range firstTabs {
		handlerstest.ExpectDataChanged(t, tab, "reminder", "[3]")
		expectNothingElse(t, tab)
	}
	handlerstest.ExpectDataChanged(t, admin, "backup", `["manual-1"]`)
	handlerstest.ExpectDataChanged(t, admin, "tag", "[7]")
	expectNothingElse(t, admin)
	handlerstest.ExpectDataChanged(t, second, "tag", "[7]")
	expectNothingElse(t, second)
}
