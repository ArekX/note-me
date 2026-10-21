package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	sdk "github.com/modelcontextprotocol/go-sdk/mcp"

	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/encryption"
	"noteme/internal/http/requeststate"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/api"
)

var helpFiles = fstest.MapFS{
	"index.html":                  {Data: []byte("<html>app</html>")},
	"help/index.json":             {Data: []byte(`[{"key":"general","name":"General","permission":null},{"key":"admin-users","name":"Admin: Users","permission":"canUpdateUsers"}]`)},
	"help/general.md":             {Data: []byte("# General\n\nNotes are markdown.")},
	"help/admin-users.md":         {Data: []byte("# Admin: Users")},
	"help/not-in-the-index.md":    {Data: []byte("# Hidden")},
	"assets/should-not-matter.js": {Data: []byte("")},
}

type mcpTestServer struct {
	srv *Server
	hub *websocket.Hub
	url string
}

func newMCPTestServer(t *testing.T) *mcpTestServer {
	t.Helper()
	srv, hub := newTestServerWith(t, helpFiles, api.NewHub)
	server := httptest.NewServer(srv.Handler())
	t.Cleanup(server.Close)
	if _, err := srv.components.DB.ExecContext(context.Background(), `UPDATE "user" SET "is_password_reset_required" = false`); err != nil {
		t.Fatal(err)
	}
	srv.components.Config.AppURL.Host = strings.TrimPrefix(server.URL, "http://")
	return &mcpTestServer{srv: srv, hub: hub, url: server.URL}
}

func (m *mcpTestServer) addUser(t *testing.T, username, role string) int {
	t.Helper()
	id, err := m.srv.components.Repository.Users().CreateUserRecord(context.Background(), repository.NewUserRecord{
		Name: username, Username: username, Password: "password123", Role: role, Timezone: "UTC",
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := m.srv.components.DB.ExecContext(context.Background(), `UPDATE "user" SET "is_password_reset_required" = false`); err != nil {
		t.Fatal(err)
	}
	return int(id)
}

// Through the users namespace, as the profile page does.
func (m *mcpTestServer) call(t *testing.T, userID int, typ string, payload any) map[string]any {
	t.Helper()
	record, err := m.srv.components.Repository.Users().GetUserById(context.Background(), userID)
	if err != nil || record == nil {
		t.Fatalf("user %d: %v", userID, err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	data, err := m.hub.Call(ctx, websocket.Caller{Session: *requeststate.NewSession(record)}, "users", typ, payload)
	if err != nil {
		t.Fatalf("%s: %v", typ, err)
	}
	var response map[string]any
	if err := json.Unmarshal(data, &response); err != nil {
		t.Fatal(err)
	}
	return response
}

func (m *mcpTestServer) createClient(t *testing.T, userID int, kind string, readOnly bool, redirectURIs ...string) (map[string]any, string) {
	t.Helper()
	if redirectURIs == nil {
		redirectURIs = []string{}
	}
	response := m.call(t, userID, "createMcpClient", map[string]any{"data": map[string]any{
		"name": kind + "-" + time.Now().Format("150405.000000000"), "kind": kind, "is_read_only": readOnly, "redirect_uris": redirectURIs,
	}})
	return response["client"].(map[string]any), response["secret"].(string)
}

type bearerTransport struct {
	token  string
	header http.Header
}

func (b bearerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.Header.Set("Authorization", "Bearer "+b.token)
	for key, values := range b.header {
		req.Header[key] = values
	}
	return http.DefaultTransport.RoundTrip(req)
}

func (m *mcpTestServer) connect(t *testing.T, token string) (*sdk.ClientSession, error) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	client := sdk.NewClient(&sdk.Implementation{Name: "test", Version: "1"}, nil)
	session, err := client.Connect(ctx, &sdk.StreamableClientTransport{
		Endpoint:             m.url + "/mcp",
		HTTPClient:           &http.Client{Transport: bearerTransport{token: token}},
		DisableStandaloneSSE: true,
		MaxRetries:           -1,
	}, nil)
	if session != nil {
		t.Cleanup(func() { session.Close() })
	}
	return session, err
}

func toolNames(t *testing.T, session *sdk.ClientSession) []string {
	t.Helper()
	result, err := session.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	names := []string{}
	for _, tool := range result.Tools {
		names = append(names, tool.Name)
	}
	return names
}

func callTool(t *testing.T, session *sdk.ClientSession, name string, arguments any) (string, bool) {
	t.Helper()
	result, err := session.CallTool(context.Background(), &sdk.CallToolParams{Name: name, Arguments: arguments})
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	return result.Content[0].(*sdk.TextContent).Text, result.IsError
}

func TestMCPToolsFollowTheRole(t *testing.T) {
	m := newMCPTestServer(t)
	userID := m.addUser(t, "ada", "user")
	_, token := m.createClient(t, userID, "token", false)

	session, err := m.connect(t, token)
	if err != nil {
		t.Fatal(err)
	}
	names := toolNames(t, session)
	for _, name := range []string{"get_tree", "create_note", "update_note", "search_notes", "get_profile", "list_help_topics", "get_help_topic", "get_passkeys"} {
		if !slices.Contains(names, name) {
			t.Errorf("tools lack %s", name)
		}
	}
	for _, name := range []string{"find_users", "open_note", "open_help", "set_note_protection", "add_passkey", "delete_passkey", "export_my_data"} {
		if slices.Contains(names, name) {
			t.Errorf("tools have %s", name)
		}
	}

	if _, err := m.srv.components.DB.ExecContext(context.Background(), `UPDATE "user" SET "role" = 'admin' WHERE "id" = ?`, userID); err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(toolNames(t, session), "find_users") {
		t.Error("role change did not apply on the next call")
	}

	result, err := session.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	for _, tool := range result.Tools {
		switch tool.Name {
		case "get_tree":
			if !tool.Annotations.ReadOnlyHint || *tool.Annotations.DestructiveHint {
				t.Errorf("get_tree annotations = %+v", tool.Annotations)
			}
		case "delete_user":
			if tool.Annotations.ReadOnlyHint || !*tool.Annotations.DestructiveHint {
				t.Errorf("delete_user annotations = %+v", tool.Annotations)
			}
		}
	}
}

func TestMCPToolCalls(t *testing.T) {
	m := newMCPTestServer(t)
	userID := m.addUser(t, "ada", "user")
	_, token := m.createClient(t, userID, "token", false)
	session, err := m.connect(t, token)
	if err != nil {
		t.Fatal(err)
	}

	text, isError := callTool(t, session, "create_note", map[string]any{"title": "Plan", "text": "Buy milk", "tags": []string{"home"}})
	if isError || !strings.Contains(text, `"title":"Plan"`) {
		t.Fatalf("create_note = %s (error %v)", text, isError)
	}
	var created struct {
		Record struct {
			ID int64 `json:"id"`
		} `json:"record"`
	}
	if err := json.Unmarshal([]byte(text), &created); err != nil || created.Record.ID == 0 {
		t.Fatalf("create_note result %s: %v", text, err)
	}

	if text, isError := callTool(t, session, "get_note", map[string]any{"id": created.Record.ID}); isError || !strings.Contains(text, "Buy milk") {
		t.Errorf("get_note = %s", text)
	}
	if text, isError := callTool(t, session, "get_note", map[string]any{"id": 9999}); !isError || text != "Requested note not found." {
		t.Errorf("missing note = %s (error %v)", text, isError)
	}
	if text, isError := callTool(t, session, "create_note", map[string]any{"title": 1}); !isError || !strings.Contains(text, "invalid_type") {
		t.Errorf("bad arguments = %s (error %v)", text, isError)
	}
	if text, _ := callTool(t, session, "get_profile", nil); !strings.Contains(text, `"username":"ada"`) || !strings.Contains(text, `"preferred_editor"`) {
		t.Errorf("get_profile = %s", text)
	}

	if text, _ := callTool(t, session, "list_help_topics", nil); text != `[{"name":"General","topic":"general"}]` {
		t.Errorf("list_help_topics = %s", text)
	}
	if text, _ := callTool(t, session, "get_help_topic", map[string]any{"topic": "general"}); !strings.Contains(text, "Notes are markdown.") {
		t.Errorf("get_help_topic = %s", text)
	}
	for _, topic := range []string{"admin-users", "not-in-the-index"} {
		if text, isError := callTool(t, session, "get_help_topic", map[string]any{"topic": topic}); !isError || !strings.Contains(text, "There is no help topic") {
			t.Errorf("%s = %s (error %v)", topic, text, isError)
		}
	}

	var touched *int64
	if err := m.srv.components.DB.QueryRowContext(context.Background(), `SELECT "last_used_at" FROM "mcp_client"`).Scan(&touched); err != nil || touched == nil {
		t.Errorf("last_used_at = %v (%v)", touched, err)
	}
}

func TestMCPNeverReturnsProtectedNotes(t *testing.T) {
	m := newMCPTestServer(t)
	userID := m.addUser(t, "ada", "user")
	_, token := m.createClient(t, userID, "token", false)
	session, err := m.connect(t, token)
	if err != nil {
		t.Fatal(err)
	}

	text, _ := callTool(t, session, "create_note", map[string]any{"title": "Diary", "text": "secret words"})
	var created struct {
		Record struct {
			ID int64 `json:"id"`
		} `json:"record"`
	}
	if err := json.Unmarshal([]byte(text), &created); err != nil {
		t.Fatal(err)
	}
	callTool(t, session, "update_note", map[string]any{"id": created.Record.ID, "text": "secret words, edited"})
	if _, err := m.srv.components.DB.ExecContext(context.Background(), `UPDATE "note" SET "is_encrypted" = 1, "note" = 'v2:sealed' WHERE "id" = ?`, created.Record.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := m.srv.components.DB.ExecContext(context.Background(), `UPDATE "note_history" SET "is_encrypted" = 1, "note" = 'v2:sealed-history' WHERE "note_id" = ?`, created.Record.ID); err != nil {
		t.Fatal(err)
	}

	text, isError := callTool(t, session, "get_note", map[string]any{"id": created.Record.ID})
	if isError || strings.Contains(text, "sealed") || !strings.Contains(text, "This note is protected and cannot be read over MCP.") || !strings.Contains(text, `"title":"Diary"`) {
		t.Errorf("get_note = %s", text)
	}
	if text, _ := callTool(t, session, "search_notes", map[string]any{"query": ""}); strings.Contains(text, "sealed") || !strings.Contains(text, "Diary") {
		t.Errorf("search_notes = %s", text)
	}
	history, _ := callTool(t, session, "get_note_history", map[string]any{"note_id": created.Record.ID})
	var versions struct {
		Records struct {
			Results []struct {
				ID int64 `json:"id"`
			} `json:"results"`
		} `json:"records"`
	}
	if err := json.Unmarshal([]byte(history), &versions); err != nil || len(versions.Records.Results) == 0 {
		t.Fatalf("get_note_history = %s (%v)", history, err)
	}
	if text, _ := callTool(t, session, "get_history_version", map[string]any{"id": versions.Records.Results[0].ID}); strings.Contains(text, "sealed") || !strings.Contains(text, "cannot be read over MCP") {
		t.Errorf("get_history_version = %s", text)
	}

	text, isError = callTool(t, session, "update_note", map[string]any{"id": created.Record.ID, "title": "Renamed"})
	if !isError || text != "This note is protected and cannot be changed over MCP." {
		t.Errorf("update_note = %s (error %v)", text, isError)
	}
}

func TestMCPReadOnlyClient(t *testing.T) {
	m := newMCPTestServer(t)
	userID := m.addUser(t, "ada", "user")
	_, token := m.createClient(t, userID, "token", true)
	session, err := m.connect(t, token)
	if err != nil {
		t.Fatal(err)
	}

	names := toolNames(t, session)
	if !slices.Contains(names, "search_notes") || !slices.Contains(names, "get_help_topic") || slices.Contains(names, "create_note") || slices.Contains(names, "update_profile") {
		t.Errorf("read only tools = %v", names)
	}
	result, err := session.CallTool(context.Background(), &sdk.CallToolParams{Name: "create_note", Arguments: map[string]any{"title": "x", "text": "y"}})
	if err == nil && !result.IsError {
		t.Error("read only client created a note")
	}
	var count int
	if err := m.srv.components.DB.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM "note"`).Scan(&count); err != nil || count != 0 {
		t.Errorf("notes = %d (%v)", count, err)
	}
}

func mcpRequest(t *testing.T, url, token string, header http.Header) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, url+"/mcp", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for key, values := range header {
		req.Header[key] = values
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func TestMCPRefusesBadTokens(t *testing.T) {
	m := newMCPTestServer(t)
	userID := m.addUser(t, "ada", "user")
	client, token := m.createClient(t, userID, "token", false)

	if resp := mcpRequest(t, m.url, token, nil); resp.StatusCode != http.StatusOK {
		t.Fatalf("valid token: %d", resp.StatusCode)
	}

	resp := mcpRequest(t, m.url, "", nil)
	if resp.StatusCode != http.StatusUnauthorized || !strings.Contains(resp.Header.Get("WWW-Authenticate"), "/.well-known/oauth-protected-resource/mcp") {
		t.Errorf("no token: %d %q", resp.StatusCode, resp.Header.Get("WWW-Authenticate"))
	}
	if resp := mcpRequest(t, m.url, "nmcp_unknown", nil); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("unknown token: %d", resp.StatusCode)
	}
	if len(auditEvents(t, m.srv, audit.MCPTokenRefused)) == 0 {
		t.Error("refused token not audited")
	}

	expired := encryption.RandomToken("nmcp_", 32)
	past := time.Now().Add(-time.Minute).Unix()
	if _, err := m.srv.components.Repository.MCP().CreateToken(context.Background(), repository.NewMCPToken{
		ClientId: int64(client["id"].(float64)), Kind: repository.MCPTokenAccess, TokenHash: encryption.TokenHash(expired), TokenPrefix: expired[:11], ExpiresAt: &past,
	}); err != nil {
		t.Fatal(err)
	}
	if resp := mcpRequest(t, m.url, expired, nil); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expired token: %d", resp.StatusCode)
	}

	foreign := http.Header{"Origin": {"https://evil.example"}, "Sec-Fetch-Site": {"cross-site"}}
	if resp := mcpRequest(t, m.url, token, foreign); resp.StatusCode != http.StatusForbidden {
		t.Errorf("foreign origin: %d", resp.StatusCode)
	}

	if _, err := m.srv.components.DB.ExecContext(context.Background(), `UPDATE "user" SET "is_password_reset_required" = true WHERE "id" = ?`, userID); err != nil {
		t.Fatal(err)
	}
	if resp := mcpRequest(t, m.url, token, nil); resp.StatusCode != http.StatusForbidden {
		t.Errorf("password reset pending: %d", resp.StatusCode)
	}
	if _, err := m.srv.components.DB.ExecContext(context.Background(), `UPDATE "user" SET "is_password_reset_required" = false WHERE "id" = ?`, userID); err != nil {
		t.Fatal(err)
	}

	m.call(t, userID, "regenerateMcpClientSecret", map[string]any{"id": client["id"]})
	if resp := mcpRequest(t, m.url, token, nil); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("regenerated token: %d", resp.StatusCode)
	}

	_, token = m.createClient(t, userID, "token", false)
	m.call(t, userID, "deleteMcpClient", map[string]any{"id": client["id"]})
	if resp := mcpRequest(t, m.url, token, nil); resp.StatusCode != http.StatusOK {
		t.Errorf("other client after delete: %d", resp.StatusCode)
	}
	if _, err := m.srv.components.Repository.UserManagement().DeleteUserRecord(context.Background(), userID, 1); err != nil {
		t.Fatal(err)
	}
	if resp := mcpRequest(t, m.url, token, nil); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("deleted user: %d", resp.StatusCode)
	}
}

func TestMCPHostCheck(t *testing.T) {
	m := newMCPTestServer(t)
	userID := m.addUser(t, "ada", "user")
	_, token := m.createClient(t, userID, "token", false)

	for host, want := range map[string]int{
		"evil.example":                      http.StatusForbidden,
		m.srv.components.Config.AppURL.Host: http.StatusOK,
		"localhost:8000":                    http.StatusOK,
	} {
		req, err := http.NewRequest(http.MethodPost, m.url+"/mcp", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`))
		if err != nil {
			t.Fatal(err)
		}
		req.Host = host
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json, text/event-stream")
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != want {
			t.Errorf("Host %s: %d, want %d", host, resp.StatusCode, want)
		}
	}
}
