package websocket

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/coder/websocket"

	"noteme/internal/http/requeststate"
	"noteme/internal/http/websocket/messages"
)

func callAs(role string) Caller {
	return Caller{Session: requeststate.Session{UserId: 1, Username: "admin", Role: role}, IP: "203.0.113.5"}
}

func call(t *testing.T, hub *Hub, caller Caller, typ string, payload any) (map[string]any, error) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	data, err := hub.Call(ctx, caller, "test", typ, payload)
	if err != nil {
		return nil, err
	}
	var msg map[string]any
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatal(err)
	}
	return msg, nil
}

func TestCallReturnsTheResponse(t *testing.T) {
	hub, _, _ := newTestHub(t)

	msg, err := call(t, hub, callAs("admin"), "echo", map[string]any{"value": "hi", "type": "ignored"})
	if err != nil {
		t.Fatal(err)
	}
	expect(t, msg, map[string]any{"namespace": "test", "type": "echoResponse", "value": "hi", "can_update_users": true})

	msg, err = call(t, hub, callAs("user"), "echo", nil)
	if err != nil {
		t.Fatal(err)
	}
	expect(t, msg, map[string]any{"value": "", "can_update_users": false})
}

func TestCallErrors(t *testing.T) {
	hub, _, _ := newTestHub(t)

	cases := map[string]string{
		"forbidden": "User does not have the required permission: canDoNothing",
		"invalid":   `[{"code":"custom","path":["name"],"message":"Name is required"}]`,
		"fail":      "Error while processing the request",
		"panic":     "Error while processing the request",
		"missing":   "No handler found",
	}
	for typ, want := range cases {
		_, err := call(t, hub, callAs("admin"), typ, nil)
		var clientErr *ClientError
		if !errors.As(err, &clientErr) || err.Error() != want {
			t.Errorf("%s: error = %v, want %q", typ, err, want)
		}
	}

	stepRequired := callAs("admin")
	stepRequired.Session.IsPasswordResetRequired = true
	if _, err := call(t, hub, stepRequired, "echo", nil); err == nil || err.Error() != stepRequiredMessage {
		t.Errorf("pending step: error = %v", err)
	}

	if _, err := call(t, hub, callAs("admin"), "echo", []string{"not an object"}); err == nil {
		t.Error("array payload accepted")
	}
}

func TestCallUsesNoConnectionSlot(t *testing.T) {
	hub, c, url := newTestHub(t)
	c.Config.MaxConnectionsPerUser = 1
	conn := dial(t, url)
	echo(t, conn, "a")

	if _, err := call(t, hub, callAs("admin"), "echo", nil); err != nil {
		t.Fatal(err)
	}
	if hub.ClientCount(1) != 1 {
		t.Errorf("connections = %d, want 1", hub.ClientCount(1))
	}
}

func TestCallResponseReachesEveryTab(t *testing.T) {
	hub, _, url := newTestHub(t)
	hub.Handle("test", "change", func(ctx context.Context, req *Request) error {
		go func() {
			req.Send(ctx, &echoResponse{Header: messages.Header{Type: "progress"}})
			req.RespondToUser(ctx, &echoResponse{Header: messages.Header{Type: "changeResponse"}, Value: "done"})
		}()
		return nil
	})
	first, second := dial(t, url), dial(t, url)
	echo(t, first, "a")
	echo(t, second, "b")

	msg, err := call(t, hub, callAs("admin"), "change", nil)
	if err != nil {
		t.Fatal(err)
	}
	expect(t, msg, map[string]any{"type": "changeResponse", "value": "done"})
	for _, conn := range []*websocket.Conn{first, second} {
		expect(t, read(t, conn), map[string]any{"type": "changeResponse", "requestId": msg["requestId"]})
	}
}

func TestCallEndsWithTheContext(t *testing.T) {
	hub, _, _ := newTestHub(t)
	hub.Handle("test", "silent", func(context.Context, *Request) error { return nil })

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if _, err := hub.Call(ctx, callAs("admin"), "test", "silent", nil); !errors.Is(err, context.DeadlineExceeded) {
		t.Errorf("error = %v", err)
	}
}
