package handlerstest

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"

	"noteme/internal/components"
	"noteme/internal/components/repository"
	"noteme/internal/config"
	"noteme/internal/http/requeststate"
	ws "noteme/internal/http/websocket"
	"noteme/internal/logger"
)

const AdminID = 1

type Server struct {
	C   *components.Components
	hub *ws.Hub
	url string
}

// The namespaces under test are registered before any connection exists.
func New(t *testing.T, namespaces func(c *components.Components) []ws.Namespace) *Server {
	t.Helper()
	return NewWithConfig(t, nil, namespaces)
}

// Every test user has completed the password reset step, as the websocket
// upgrade requires.
func NewWithConfig(t *testing.T, configure func(cfg *config.Config), namespaces func(c *components.Components) []ws.Namespace) *Server {
	t.Helper()
	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	cfg.DatabaseType = "sqlite"
	cfg.DatabaseDsn = ":memory:"
	cfg.TempDir = filepath.Join(t.TempDir(), "temp")
	cfg.FilesDir = filepath.Join(t.TempDir(), "files")
	cfg.BackupDir = filepath.Join(t.TempDir(), "backup")
	if configure != nil {
		configure(cfg)
	}
	c, err := components.New(context.Background(), logger.New(logger.Options{Level: "ERROR", Output: io.Discard}), logger.NewBuffer(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.Cleanup() })
	if err := c.Initialize(context.Background()); err != nil {
		t.Fatal(err)
	}
	if err := c.Storage.Init(); err != nil {
		t.Fatal(err)
	}
	completePasswordReset(t, c, AdminID)

	hub := ws.NewHub(c)
	hub.RegisterNamespaces(namespaces(c)...)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, _ := strconv.Atoi(r.URL.Query().Get("user"))
		r = r.WithContext(requeststate.NewCtxValue(r.Context()))
		state, _ := requeststate.FromCtx(r.Context())
		record, err := c.Repository.Users().GetUserById(r.Context(), userID)
		if err != nil || record == nil {
			t.Errorf("load test user %d: %v", userID, err)
			return
		}
		state.Session = requeststate.NewSession(record)
		state.SessionKey = r.URL.Query().Get("session")
		hub.HandleRequest(c, w, r)
	}))
	t.Cleanup(server.Close)

	return &Server{C: c, hub: hub, url: "ws" + strings.TrimPrefix(server.URL, "http")}
}

func completePasswordReset(t *testing.T, c *components.Components, userID int) {
	t.Helper()
	if _, err := c.DB.ExecContext(context.Background(), `UPDATE "user" SET "is_password_reset_required" = false WHERE "id" = ?`, userID); err != nil {
		t.Fatal(err)
	}
}

func (s *Server) AddUser(t *testing.T, username string) int {
	t.Helper()
	return s.AddUserWithRole(t, username, "user")
}

func (s *Server) AddUserWithRole(t *testing.T, username, role string) int {
	t.Helper()
	id, err := s.C.Repository.Users().CreateUserRecord(context.Background(), repository.NewUserRecord{
		Name: username, Username: username, Password: "password123", Role: role, Timezone: "UTC",
	})
	if err != nil {
		t.Fatal(err)
	}
	completePasswordReset(t, s.C, id)
	return id
}

func (s *Server) Dial(t *testing.T, userID int) *websocket.Conn {
	t.Helper()
	return s.DialSession(t, userID, "session-"+strconv.Itoa(userID))
}

// Connections with the same session key are tabs of one browser session and
// share one session row, which the hub checks while the connection is open.
// The handshake finishes before the hub registers the client, so Dial waits
// for the registration; otherwise a push sent right away can miss this tab.
func (s *Server) DialSession(t *testing.T, userID int, sessionKey string) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	s.createSession(t, userID, sessionKey)
	registered := s.hub.ClientCount(userID)
	conn, _, err := websocket.Dial(ctx, s.url+"?user="+strconv.Itoa(userID)+"&session="+url.QueryEscape(sessionKey), nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.CloseNow() })
	for s.hub.ClientCount(userID) <= registered {
		if ctx.Err() != nil {
			t.Fatalf("connection of user %d was not registered", userID)
		}
		time.Sleep(time.Millisecond)
	}
	return conn
}

func (s *Server) createSession(t *testing.T, userID int, sessionKey string) {
	t.Helper()
	ctx := context.Background()
	exists, err := s.C.Repository.Sessions().SessionExists(ctx, sessionKey)
	if err != nil {
		t.Fatal(err)
	}
	if exists {
		return
	}
	record, err := s.C.Repository.Users().GetUserById(ctx, userID)
	if err != nil || record == nil {
		t.Fatalf("load test user %d: %v", userID, err)
	}
	data, err := requeststate.NewSession(record).ToJson()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.C.Repository.Sessions().CreateNewSession(ctx, repository.NewSessionRecord{
		Key: sessionKey, UserId: userID, ExpiresAt: time.Now().Add(time.Hour).UnixMilli(), Data: data,
	}); err != nil {
		t.Fatal(err)
	}
}

func (s *Server) CreateNote(t *testing.T, userID int, title string, groupID *int64, tags ...string) int64 {
	t.Helper()
	ctx := context.Background()
	record, err := s.C.Repository.Notes().CreateNote(ctx, repository.NewNoteRecord{Title: title, Note: "text", IsWide: true, UserId: userID})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.C.Repository.Notes().AssignNoteToGroup(ctx, userID, record.Id, groupID); err != nil {
		t.Fatal(err)
	}
	if err := s.C.Repository.Tags().LinkNoteWithTags(ctx, userID, record.Id, tags); err != nil {
		t.Fatal(err)
	}
	return record.Id
}

func Send(t *testing.T, conn *websocket.Conn, message string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := conn.Write(ctx, websocket.MessageText, []byte(message)); err != nil {
		t.Fatal(err)
	}
}

// Binary frame: [uint16 BE header length][uint32 BE data length][JSON header][data].
func SendBinary(t *testing.T, conn *websocket.Conn, header string, data []byte) {
	t.Helper()
	frame := make([]byte, 6, 6+len(header)+len(data))
	binary.BigEndian.PutUint16(frame[0:2], uint16(len(header)))
	binary.BigEndian.PutUint32(frame[2:6], uint32(len(data)))
	frame = append(append(frame, header...), data...)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := conn.Write(ctx, websocket.MessageBinary, frame); err != nil {
		t.Fatal(err)
	}
}

func Read(t *testing.T, conn *websocket.Conn) map[string]any {
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

func Request(t *testing.T, conn *websocket.Conn, message string) map[string]any {
	t.Helper()
	Send(t, conn, message)
	return Read(t, conn)
}

func Encode(t *testing.T, value any) string {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

// ids is the JSON of the expected ids, such as `[1]`.
func ExpectDataChanged(t *testing.T, conn *websocket.Conn, entity, ids string) {
	t.Helper()
	msg := Read(t, conn)
	if msg["namespace"] != "changes" || msg["type"] != "dataChanged" || msg["entity"] != entity || Encode(t, msg["ids"]) != ids {
		t.Errorf("got %v, want dataChanged of %s %s", msg, entity, ids)
	}
}

// For a user's other tab, which gets the response of every change.
func ExpectType(t *testing.T, conn *websocket.Conn, typ string) map[string]any {
	t.Helper()
	msg := Read(t, conn)
	if msg["type"] != typ {
		t.Errorf("got %v, want %s", msg, typ)
	}
	return msg
}
