package users

import (
	"context"
	"strings"
	"testing"

	"noteme/internal/components/audit"
	"noteme/internal/encryption"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func createMcpClient(kind, name string, uris string) string {
	return `{"requestId":"c","namespace":"users","type":"createMcpClient","data":{"name":"` + name + `","kind":"` + kind + `","is_read_only":false,"redirect_uris":` + uris + `}}`
}

func TestMcpClients(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "ada")
	conn, otherTab := s.Dial(t, user), s.Dial(t, user)

	response := handlerstest.Request(t, conn, createMcpClient("token", " Claude Code ", `["https://ignored.example"]`))
	client := response["client"].(map[string]any)
	secret, _ := response["secret"].(string)
	if response["type"] != "createMcpClientResponse" || client["name"] != "Claude Code" || client["kind"] != "token" ||
		!strings.HasPrefix(secret, "nmcp_") || client["token_prefix"] != secret[:11] || client["client_id"] != nil || len(client["redirect_uris"].([]any)) != 0 {
		t.Fatalf("create token client = %v", response)
	}
	if copy := handlerstest.ExpectType(t, otherTab, "createMcpClientResponse"); copy["secret"] != nil {
		t.Errorf("secret reached the other tab: %v", copy)
	}
	if copy := handlerstest.ExpectType(t, conn, "createMcpClientResponse"); copy["secret"] != nil || copy["requestId"] == "c" || copy["namespace"] != "users" {
		t.Errorf("change copy = %v", copy)
	}
	var hash string
	if err := s.C.DB.QueryRowContext(context.Background(), `SELECT "token_hash" FROM "mcp_token"`).Scan(&hash); err != nil || hash != encryption.TokenHash(secret) {
		t.Errorf("stored token hash = %q (%v)", hash, err)
	}

	response = handlerstest.Request(t, conn, createMcpClient("oauth", "ChatGPT", `["https://chatgpt.com/connector_platform_oauth_redirect","http://localhost:3000/cb"]`))
	oauthClient := response["client"].(map[string]any)
	oauthSecret, _ := response["secret"].(string)
	if !strings.HasPrefix(oauthSecret, "nmcps_") || oauthClient["client_id"] == nil || oauthClient["token_prefix"] != nil || len(oauthClient["redirect_uris"].([]any)) != 2 {
		t.Fatalf("create oauth client = %v", response)
	}
	handlerstest.Read(t, conn)
	handlerstest.ExpectType(t, otherTab, "createMcpClientResponse")

	for name, tc := range map[string]struct{ message, want string }{
		"duplicate":    {createMcpClient("token", "Claude Code", `[]`), "MCP client with this name already exists."},
		"empty name":   {createMcpClient("token", "  ", `[]`), "Name must have at least one character"},
		"kind":         {createMcpClient("other", "x", `[]`), `Invalid option: expected one of \"token\"|\"oauth\"`},
		"no uris":      {createMcpClient("oauth", "x", `[]`), "Add at least one redirect URI."},
		"http uri":     {createMcpClient("oauth", "x", `["http://example.com/cb"]`), "Redirect URI must use https, or http on localhost."},
		"fragment uri": {createMcpClient("oauth", "x", `["https://example.com/cb#x"]`), "Redirect URI must use https, or http on localhost."},
		"too many": {createMcpClient("oauth", "x", `["https://a.example","https://a.example","https://a.example","https://a.example","https://a.example","https://a.example","https://a.example","https://a.example","https://a.example","https://a.example","https://a.example"]`),
			"At most 10 redirect URIs are allowed."},
	} {
		if response := handlerstest.Request(t, conn, tc.message); response["type"] != "error" || !strings.Contains(response["message"].(string), tc.want) {
			t.Errorf("%s = %v", name, response)
		}
	}

	id := handlerstest.Encode(t, oauthClient["id"])
	response = handlerstest.Request(t, conn, `{"requestId":"u","namespace":"users","type":"updateMcpClient","id":`+id+`,"data":{"name":"ChatGPT","is_read_only":true,"redirect_uris":["https://chatgpt.com/connector_platform_oauth_redirect"]}}`)
	if updated := response["client"].(map[string]any); updated["is_read_only"] != true || len(updated["redirect_uris"].([]any)) != 1 {
		t.Errorf("update = %v", response)
	}
	handlerstest.ExpectType(t, otherTab, "updateMcpClientResponse")

	response = handlerstest.Request(t, conn, `{"requestId":"g","namespace":"users","type":"regenerateMcpClientSecret","id":`+id+`}`)
	if renewed, _ := response["secret"].(string); !strings.HasPrefix(renewed, "nmcps_") || renewed == oauthSecret {
		t.Errorf("regenerate = %v", response)
	}
	if copy := handlerstest.ExpectType(t, conn, "regenerateMcpClientSecretResponse"); copy["secret"] != nil || copy["namespace"] != "users" {
		t.Errorf("change copy = %v", copy)
	}

	other := s.Dial(t, s.AddUser(t, "bob"))
	for _, message := range []string{
		`{"requestId":"x","namespace":"users","type":"updateMcpClient","id":` + id + `,"data":{"name":"Mine","is_read_only":false,"redirect_uris":[]}}`,
		`{"requestId":"x","namespace":"users","type":"regenerateMcpClientSecret","id":` + id + `}`,
	} {
		if response := handlerstest.Request(t, other, message); response["message"] != "MCP client not found." {
			t.Errorf("another user's client = %v", response)
		}
	}
	if response := handlerstest.Request(t, other, `{"requestId":"l","namespace":"users","type":"getMcpClients"}`); len(response["clients"].([]any)) != 0 {
		t.Errorf("another user's list = %v", response)
	}
	handlerstest.Request(t, other, `{"requestId":"d","namespace":"users","type":"deleteMcpClient","id":`+id+`}`)

	response = handlerstest.Request(t, conn, `{"requestId":"l","namespace":"users","type":"getMcpClients"}`)
	if clients := response["clients"].([]any); len(clients) != 2 || clients[0].(map[string]any)["name"] != "ChatGPT" {
		t.Errorf("list = %v", response)
	}
	handlerstest.Request(t, conn, `{"requestId":"d","namespace":"users","type":"deleteMcpClient","id":`+id+`}`)
	if response := handlerstest.Request(t, conn, `{"requestId":"l","namespace":"users","type":"getMcpClients"}`); len(response["clients"].([]any)) != 1 {
		t.Errorf("list after delete = %v", response)
	}

	for _, event := range []string{audit.MCPClientCreated, audit.MCPClientUpdated, audit.MCPClientSecretRenewed, audit.MCPClientDeleted} {
		if len(auditEvents(t, s, event)) == 0 {
			t.Errorf("%s not audited", event)
		}
	}
}
