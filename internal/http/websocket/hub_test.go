package websocket

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"

	"noteme/internal/components"
	"noteme/internal/components/repository"
	"noteme/internal/config"
	"noteme/internal/http/rbac"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket/messages"
	"noteme/internal/logger"
)

const testSessionKey = "key"

type echoResponse struct {
	messages.Header
	Value          string `json:"value"`
	Bytes          int    `json:"bytes"`
	CanUpdateUsers bool   `json:"can_update_users"`
}

func newTestHub(t *testing.T) (*Hub, *components.Components, string) {
	t.Helper()
	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	cfg.DatabaseType = "sqlite"
	cfg.DatabaseDsn = ":memory:"
	c, err := components.New(context.Background(), logger.New(logger.Options{Level: "ERROR", Output: io.Discard}), nil, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.Cleanup() })
	if err := c.Initialize(context.Background()); err != nil {
		t.Fatal(err)
	}

	hub := NewHub(c)
	hub.Handle("test", "echo", func(ctx context.Context, req *Request) error {
		var body struct {
			Value string `json:"value"`
		}
		if err := req.Decode(&body); err != nil {
			return err
		}
		return req.Respond(ctx, &echoResponse{
			Header:         messages.Header{Type: "echoResponse"},
			Value:          body.Value,
			Bytes:          len(req.BinaryData),
			CanUpdateUsers: req.Client.Can(rbac.CanUpdateUsers),
		})
	})
	hub.Handle("test", "fail", func(ctx context.Context, req *Request) error {
		return errors.New("disk on fire")
	})
	hub.Handle("test", "forbidden", func(ctx context.Context, req *Request) error {
		return req.Client.Require("canDoNothing")
	})
	hub.Handle("test", "invalid", func(ctx context.Context, req *Request) error {
		var issues validation.Issues
		issues.Custom("name", "Name is required")
		return issues
	})
	hub.Handle("test", "panic", func(ctx context.Context, req *Request) error {
		panic("nil map write")
	})

	if _, err := c.Repository.Sessions().CreateNewSession(context.Background(), repository.NewSessionRecord{
		Key: testSessionKey, UserId: 1, ExpiresAt: time.Now().Add(time.Hour).UnixMilli(), Data: []byte(`{}`),
	}); err != nil {
		t.Fatal(err)
	}
	// The upgrade only admits sessions without a pending step.
	if _, err := c.DB.ExecContext(context.Background(), `UPDATE "user" SET "is_password_reset_required" = false WHERE "id" = 1`); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r = r.WithContext(requeststate.NewCtxValue(r.Context()))
		state, _ := requeststate.FromCtx(r.Context())
		record, err := c.Repository.Users().GetUserById(r.Context(), 1)
		if err != nil || record == nil {
			t.Errorf("load test user: %v", err)
			return
		}
		state.Session = requeststate.NewSession(record)
		state.SessionKey = testSessionKey
		hub.HandleRequest(c, w, r)
	}))
	t.Cleanup(server.Close)

	return hub, c, "ws" + strings.TrimPrefix(server.URL, "http")
}

func dial(t *testing.T, url string) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.CloseNow() })
	return conn
}

func write(t *testing.T, conn *websocket.Conn, typ websocket.MessageType, data []byte) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := conn.Write(ctx, typ, data); err != nil {
		t.Fatal(err)
	}
}

func read(t *testing.T, conn *websocket.Conn) map[string]any {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, data, err := conn.Read(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var msg map[string]any
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatal(err)
	}
	return msg
}

func binaryFrame(header string, data []byte) []byte {
	frame := make([]byte, binaryPrefixSize, binaryPrefixSize+len(header)+len(data))
	binary.BigEndian.PutUint16(frame[0:2], uint16(len(header)))
	binary.BigEndian.PutUint32(frame[2:6], uint32(len(data)))
	frame = append(frame, header...)
	return append(frame, data...)
}

func echo(t *testing.T, conn *websocket.Conn, requestID string) map[string]any {
	t.Helper()
	write(t, conn, websocket.MessageText, []byte(`{"requestId":"`+requestID+`","namespace":"test","type":"echo","value":"hi"}`))
	return read(t, conn)
}

func expect(t *testing.T, got map[string]any, want map[string]any) {
	t.Helper()
	for key, value := range want {
		if got[key] != value {
			t.Errorf("%s = %v, want %v (message %v)", key, got[key], value, got)
		}
	}
}

func TestRoundTrip(t *testing.T) {
	_, _, url := newTestHub(t)
	conn := dial(t, url)

	expect(t, echo(t, conn, "r1"), map[string]any{
		"requestId": "r1", "namespace": "test", "type": "echoResponse", "value": "hi", "bytes": 0.0,
	})

	write(t, conn, websocket.MessageBinary, binaryFrame(`{"requestId":"r2","namespace":"test","type":"echo","value":"file"}`, []byte{1, 2, 3}))
	expect(t, read(t, conn), map[string]any{
		"requestId": "r2", "namespace": "test", "type": "echoResponse", "value": "file", "bytes": 3.0,
	})
}

func TestErrorEnvelope(t *testing.T) {
	_, _, url := newTestHub(t)
	conn := dial(t, url)

	var issues validation.Issues
	issues.Custom("name", "Name is required")
	parseError := "Could not parse message properly or over the allowed size."
	mismatch := binaryFrame(`{"requestId":"r6","namespace":"test","type":"echo"}`, []byte{1})

	cases := []struct {
		name      string
		typ       websocket.MessageType
		frame     []byte
		requestID string
		message   string
	}{
		{"unknown handler", websocket.MessageText, []byte(`{"requestId":"r1","namespace":"test","type":"missing"}`), "r1", "No handler found"},
		{"internal error", websocket.MessageText, []byte(`{"requestId":"r2","namespace":"test","type":"fail"}`), "r2", "Error while processing the request"},
		{"permission", websocket.MessageText, []byte(`{"requestId":"r3","namespace":"test","type":"forbidden"}`), "r3", "User does not have the required permission: canDoNothing"},
		{"validation", websocket.MessageText, []byte(`{"requestId":"r4","namespace":"test","type":"invalid"}`), "r4", issues.Error()},
		{"invalid json", websocket.MessageText, []byte(`not json`), "", parseError},
		{"binary length mismatch", websocket.MessageBinary, mismatch[:len(mismatch)-1], "r6", parseError},
		{"binary too short", websocket.MessageBinary, []byte{0, 1}, "", parseError},
	}
	for _, tc := range cases {
		write(t, conn, tc.typ, tc.frame)
		msg := read(t, conn)
		expect(t, msg, map[string]any{"namespace": "system", "type": "error", "message": tc.message})
		if tc.requestID != "" && msg["requestId"] != tc.requestID {
			t.Errorf("%s: requestId = %v, want %s", tc.name, msg["requestId"], tc.requestID)
		}
		if tc.requestID == "" && msg["requestId"] == "" {
			t.Errorf("%s: requestId is empty", tc.name)
		}
	}

	expect(t, echo(t, conn, "after"), map[string]any{"requestId": "after", "type": "echoResponse"})
}

func TestOversizedMessageClosesConnection(t *testing.T) {
	_, _, url := newTestHub(t)

	cases := []struct {
		name      string
		typ       websocket.MessageType
		frame     []byte
		requestID string
	}{
		{"text over 1 MiB", websocket.MessageText, []byte(`{"requestId":"r1","pad":"` + strings.Repeat("x", maxJSONMessageSize) + `"}`), ""},
		{"binary over 2 MiB", websocket.MessageBinary, binaryFrame(`{"requestId":"r2","namespace":"test","type":"echo"}`, make([]byte, maxBinaryMessageSize)), "r2"},
	}
	for _, tc := range cases {
		conn := dial(t, url)
		echo(t, conn, "before")

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		// The server stops reading at the limit, so the end of the write may fail.
		_ = conn.Write(ctx, tc.typ, tc.frame)

		_, data, err := conn.Read(ctx)
		if err != nil {
			t.Fatalf("%s: no error reply: %v", tc.name, err)
		}
		var msg map[string]any
		if err := json.Unmarshal(data, &msg); err != nil {
			t.Fatal(err)
		}
		expect(t, msg, map[string]any{"namespace": "system", "type": "error", "message": "Could not parse message properly or over the allowed size."})
		if tc.requestID != "" && msg["requestId"] != tc.requestID {
			t.Errorf("%s: requestId = %v, want %s", tc.name, msg["requestId"], tc.requestID)
		}

		if _, _, err := conn.Read(ctx); err == nil {
			t.Errorf("%s: connection still open", tc.name)
		}
		cancel()
	}
}

func TestSendToUserReachesEveryConnection(t *testing.T) {
	hub, _, url := newTestHub(t)
	first, second := dial(t, url), dial(t, url)
	echo(t, first, "a")
	echo(t, second, "b")

	hub.SendToUser(context.Background(), 1, &messages.ForceLogoutResponse{
		Header: messages.Header{Namespace: messages.NamespaceUsers, Type: messages.UsersForceLogoutResponse},
	})

	for _, conn := range []*websocket.Conn{first, second} {
		msg := read(t, conn)
		expect(t, msg, map[string]any{"namespace": "users", "type": "forceLogoutResponse"})
		if msg["requestId"] == "" {
			t.Errorf("push without requestId: %v", msg)
		}
	}
}

func TestPushBackend(t *testing.T) {
	hub, _, url := newTestHub(t)
	conn := dial(t, url)
	echo(t, conn, "a")

	hub.HandleBackend(messages.NamespaceUsers, messages.UsersNotifyExportFinished, func(ctx context.Context, req *Request) error {
		var msg messages.NotifyUserExportFinished
		if err := req.Decode(&msg); err != nil {
			return err
		}
		req.Hub.SendToUser(ctx, int(msg.UserID), &messages.ExportOwnDataFinished{
			Header:   messages.Header{Namespace: messages.NamespaceUsers, Type: messages.UsersExportOwnDataFinished},
			ExportID: msg.ExportID,
		})
		return nil
	})

	hub.PushBackend(context.Background(), &messages.NotifyUserExportFinished{
		Header:   messages.Header{Namespace: messages.NamespaceUsers, Type: messages.UsersNotifyExportFinished},
		ExportID: "export-1",
		UserID:   1,
	})

	expect(t, read(t, conn), map[string]any{"type": "exportOwnDataFinished", "export_id": "export-1"})
}

func TestRefreshUserSessionReplacesConnectionSession(t *testing.T) {
	hub, c, url := newTestHub(t)
	ctx := context.Background()

	conn := dial(t, url)
	expect(t, echo(t, conn, "before"), map[string]any{"can_update_users": true})

	if _, err := c.DB.ExecContext(ctx, `UPDATE "user" SET role = 'user', is_password_reset_required = true WHERE id = 1`); err != nil {
		t.Fatal(err)
	}
	record, err := hub.RefreshUserSession(ctx, 1)
	if err != nil || record == nil || record.Role != "user" {
		t.Fatalf("refresh: %v %v", record, err)
	}

	msg := read(t, conn)
	expect(t, msg, map[string]any{"namespace": "users", "type": "sessionUpdated"})
	permissions, _ := json.Marshal(msg["permissions"])
	steps, _ := json.Marshal(msg["required_steps"])
	user, _ := msg["user"].(map[string]any)
	if string(permissions) != `["canReadTags"]` || string(steps) != `["password_reset"]` || user["role"] != "user" {
		t.Errorf("sessionUpdated = %v", msg)
	}

	// The pending step blocks every message of the refreshed connection.
	expect(t, echo(t, conn, "after"), map[string]any{"namespace": "system", "type": "error", "message": stepRequiredMessage})

	row, err := c.Repository.Sessions().GetSessionByKey(ctx, testSessionKey)
	if err != nil {
		t.Fatal(err)
	}
	session, err := requeststate.SessionFromJson([]byte(row.Data))
	if err != nil || session.Role != "user" || !session.IsPasswordResetRequired {
		t.Errorf("stored session = %s (%v)", row.Data, err)
	}

	if record, err := hub.RefreshUserSession(ctx, 999); record != nil || err != nil {
		t.Errorf("missing user: %v %v", record, err)
	}
}

func waitForClients(t *testing.T, hub *Hub, want int) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for len(hub.userClients(1)) != want {
		if time.Now().After(deadline) {
			t.Fatalf("connections = %d, want %d", len(hub.userClients(1)), want)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func TestHeartbeatClosesUnresponsiveConnections(t *testing.T) {
	hub, _, url := newTestHub(t)
	hub.pingInterval = 20 * time.Millisecond
	hub.pingTimeout = 50 * time.Millisecond

	responsive, silent := dial(t, url), dial(t, url)
	echo(t, responsive, "a")
	echo(t, silent, "b")
	// CloseRead keeps reading in the background, which answers pings.
	alive := responsive.CloseRead(context.Background())

	waitForClients(t, hub, 1)
	time.Sleep(10 * hub.pingInterval)

	if len(hub.userClients(1)) != 1 || alive.Err() != nil {
		t.Errorf("responsive connection was closed: %v", alive.Err())
	}
}

func TestShutdownClosesConnections(t *testing.T) {
	hub, _, url := newTestHub(t)
	conn := dial(t, url)
	echo(t, conn, "a")

	hub.Shutdown()

	expect(t, read(t, conn), map[string]any{"namespace": "users", "type": "forceLogoutResponse"})
	expectClosed(t, conn, websocket.StatusGoingAway)
	hub.Wait(5 * time.Second)
	waitForClients(t, hub, 0)
}

func expectClosed(t *testing.T, conn *websocket.Conn, want websocket.StatusCode) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _, err := conn.Read(ctx)
	if status := websocket.CloseStatus(err); status != want {
		t.Errorf("close status = %v (%v), want %v", status, err, want)
	}
}

func TestConnectionCap(t *testing.T) {
	hub, c, url := newTestHub(t)
	c.Config.MaxConnectionsPerUser = 1

	first := dial(t, url)
	echo(t, first, "a")
	second := dial(t, url)
	expectClosed(t, second, websocket.StatusPolicyViolation)
	if len(hub.userClients(1)) != 1 {
		t.Errorf("connections = %d, want 1", len(hub.userClients(1)))
	}
	expect(t, echo(t, first, "b"), map[string]any{"requestId": "b"})
}

func TestSlowConsumerIsDropped(t *testing.T) {
	hub, _, url := newTestHub(t)
	conn := dial(t, url)
	conn.SetReadLimit(-1)
	echo(t, conn, "a")
	silent := dial(t, url)
	echo(t, silent, "b")

	// A stalled reader fills the socket buffers, then the queue; the hub
	// must not block.
	msg := &messages.ExportOwnDataFailed{
		Header:  messages.Header{Namespace: messages.NamespaceUsers, Type: messages.UsersExportOwnDataFailed},
		Message: strings.Repeat("x", 512*1024),
	}
	done := make(chan struct{})
	go func() {
		for range 2 * outboundQueueSize {
			hub.SendToUser(context.Background(), 1, msg)
		}
		close(done)
	}()
	readCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	for {
		if _, _, err := conn.Read(readCtx); err != nil {
			t.Fatalf("reading connection was closed: %v", err)
		}
		select {
		case <-done:
			waitForClients(t, hub, 1)
			expectClosed(t, silent, -1)
			return
		default:
		}
	}
}

func TestDispatchPanicIsRecovered(t *testing.T) {
	hub, _, url := newTestHub(t)
	conn := dial(t, url)

	write(t, conn, websocket.MessageText, []byte(`{"requestId":"r1","namespace":"test","type":"panic"}`))
	expect(t, read(t, conn), map[string]any{"requestId": "r1", "namespace": "system", "type": "error", "message": "Error while processing the request"})
	expectClosed(t, conn, websocket.StatusInternalError)
	waitForClients(t, hub, 0)
}

func TestDeletedSessionClosesConnection(t *testing.T) {
	hub, c, url := newTestHub(t)
	hub.sessionCheckInterval = 20 * time.Millisecond
	conn := dial(t, url)
	echo(t, conn, "a")

	if err := c.Repository.Sessions().DeleteSessionByUserId(context.Background(), 1); err != nil {
		t.Fatal(err)
	}
	expect(t, read(t, conn), map[string]any{"namespace": "users", "type": "forceLogoutResponse"})
	expectClosed(t, conn, websocket.StatusPolicyViolation)
	waitForClients(t, hub, 0)
}

func TestLogoutOtherSessions(t *testing.T) {
	hub, _, url := newTestHub(t)
	conn := dial(t, url)
	echo(t, conn, "a")

	hub.LogoutOtherSessions(context.Background(), 1, testSessionKey)
	expect(t, echo(t, conn, "kept"), map[string]any{"requestId": "kept"})

	hub.LogoutOtherSessions(context.Background(), 1, "another-session")
	expect(t, read(t, conn), map[string]any{"namespace": "users", "type": "forceLogoutResponse"})
	expectClosed(t, conn, websocket.StatusPolicyViolation)
}

func TestDuplicateHandlerPanics(t *testing.T) {
	hub := NewHub(nil)
	hub.Handle("test", "echo", nil)
	defer func() {
		if recover() == nil {
			t.Error("second registration did not panic")
		}
	}()
	hub.Handle("test", "echo", nil)
}
