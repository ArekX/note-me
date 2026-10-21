package ai

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"testing"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/encryption"
	"noteme/internal/http/aitools"
	"noteme/internal/http/requeststate"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/changes"
	"noteme/internal/http/websocket/handlers/files"
	"noteme/internal/http/websocket/handlers/groups"
	"noteme/internal/http/websocket/handlers/handlerstest"
	"noteme/internal/http/websocket/handlers/notes"
	"noteme/internal/http/websocket/handlers/notifications"
	"noteme/internal/http/websocket/handlers/settings"
	"noteme/internal/http/websocket/handlers/tags"
	"noteme/internal/http/websocket/handlers/tree"
	"noteme/internal/http/websocket/handlers/users"
)

func TestAdminMessagesNeedThePermission(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, s.AddUser(t, "user"))
	for typ, body := range map[string]string{
		"getProviders":       "",
		"createProvider":     `,"data":{}`,
		"updateProvider":     `,"id":1,"data":{}`,
		"deleteProvider":     `,"id":1`,
		"setDefaultProvider": `,"id":null`,
		"testProvider":       `,"id":1`,
		"listProviderModels": `,"provider_type":"openai","base_url":"","api_key":null,"provider_id":null`,
		"getUserAccess":      `,"user_ids":[1]`,
		"setUserAccess":      `,"user_id":1,"access":"none","provider_id":null`,
	} {
		if response := aiRequest(t, conn, typ, body); response["message"] != "User does not have the required permission: canManageAiProviders" {
			t.Errorf("%s = %v", typ, response)
		}
	}
}

func TestProviderManagement(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)
	tab := s.Dial(t, handlerstest.AdminID)
	otherAdmin := s.Dial(t, s.AddUserWithRole(t, "other", "admin"))
	userID := s.AddUser(t, "user")
	userConn := s.Dial(t, userID)

	for data, want := range map[string]string{
		`{"name":"","type":"gemini","base_url":"ftp://x","model":""}`:   `[{"code":"too_small","path":["name"],"message":"Name must have at least one character"},{"code":"invalid_value","path":["type"],"message":"Invalid option: expected one of \"ollama\"|\"openai\"|\"claude\""},{"code":"custom","path":["base_url"],"message":"Base URL must start with http:// or https://"},{"code":"too_small","path":["model"],"message":"Model is required"}]`,
		`{"name":"OpenAI","type":"openai","base_url":"","model":"gpt"}`: `[{"code":"custom","path":["api_key"],"message":"API key is required"}]`,
		`{"name":"OpenAI","type":"openai","model":"gpt","extra":1}`:     `[{"code":"invalid_type","path":["base_url"],"message":"Invalid input: expected string, received undefined"},{"code":"unrecognized_keys","path":[],"message":"Unrecognized key: \"extra\""}]`,
	} {
		if response := aiRequest(t, conn, "createProvider", `,"data":`+data); response["message"] != want {
			t.Errorf("%s = %v", data, response["message"])
		}
	}

	created := aiRequest(t, conn, "createProvider", `,"data":{"name":"OpenAI","type":"openai","base_url":"","model":"gpt-test","api_key":"sk-very-secret"}`)
	record := created["record"].(map[string]any)
	if created["type"] != "createProviderResponse" || record["base_url"] != "https://api.openai.com/v1" || record["has_key"] != true || record["key_unreadable"] != false || record["is_default"] != false {
		t.Fatalf("created = %v", created)
	}
	if other := handlerstest.Read(t, tab); other["type"] != "createProviderResponse" {
		t.Errorf("admin's other tab = %v", other)
	}
	handlerstest.ExpectDataChanged(t, otherAdmin, "aiProvider", "["+handlerstest.Encode(t, record["id"])+"]")
	id := handlerstest.Encode(t, record["id"])
	if response := aiRequest(t, conn, "createProvider", `,"data":{"name":"OpenAI","type":"ollama","base_url":"http://localhost:11434","model":"llama"}`); response["message"] != "Provider with this name already exists." {
		t.Errorf("duplicate = %v", response)
	}
	cloud := aiRequest(t, conn, "createProvider", `,"data":{"name":"Cloud","type":"ollama","base_url":"","model":"gpt-oss:20b","api_key":"ollama-key"}`)
	if got := cloud["record"].(map[string]any); got["base_url"] != "https://ollama.com" || got["has_key"] != true {
		t.Errorf("Ollama without a base URL = %v", cloud)
	}
	handlerstest.ExpectType(t, tab, "createProviderResponse")
	handlerstest.ExpectDataChanged(t, otherAdmin, "aiProvider", "["+handlerstest.Encode(t, cloud["record"].(map[string]any)["id"])+"]")

	// Keys are stored sealed and never sent back.
	var stored string
	if err := s.C.DB.QueryRowContext(ctx, `SELECT "api_key" FROM "ai_provider" WHERE "id" = ?`, record["id"]).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	if !encryption.IsCurrentFormat(stored) || strings.Contains(stored, "sk-very-secret") {
		t.Errorf("stored key = %q", stored)
	}
	list := aiRequest(t, conn, "getProviders", "")
	updated := aiRequest(t, conn, "updateProvider", `,"id":`+id+`,"data":{"name":"OpenAI","type":"openai","base_url":"https://example.com/v1","model":"gpt-other"}`)
	for name, response := range map[string]map[string]any{"created": created, "list": list, "updated": updated} {
		if text := handlerstest.Encode(t, response); strings.Contains(text, "sk-very-secret") || strings.Contains(text, stored) {
			t.Errorf("%s response holds the key: %s", name, text)
		}
	}
	if got := updated["record"].(map[string]any); got["model"] != "gpt-other" || got["has_key"] != true {
		t.Errorf("updated = %v", updated)
	}
	handlerstest.ExpectType(t, tab, "updateProviderResponse")
	handlerstest.ExpectDataChanged(t, otherAdmin, "aiProvider", "["+id+"]")
	handlerstest.ExpectType(t, userConn, "accessChanged")

	if response := aiRequest(t, conn, "setDefaultProvider", `,"id":`+id); response["type"] != "setDefaultProviderResponse" {
		t.Errorf("set default = %v", response)
	}
	handlerstest.ExpectType(t, userConn, "accessChanged")
	if provider, err := s.C.Repository.AI().GetEffectiveProvider(context.Background(), userID); err != nil || provider == nil || provider.Name != "OpenAI" {
		t.Errorf("user provider after default = %v, %v", provider, err)
	}
	// Users are not told which provider or model they use.
	if response := aiRequest(t, userConn, "getAccess", ""); handlerstest.Encode(t, response) != `{"enabled":true,"namespace":"ai","requestId":"r","type":"getAccessResponse"}` {
		t.Errorf("user access after default = %v", response)
	}
	if response := aiRequest(t, conn, "setDefaultProvider", `,"id":999`); response["message"] != providerNotFound {
		t.Errorf("missing default = %v", response)
	}

	if response := aiRequest(t, conn, "deleteProvider", `,"id":`+id); response["deleted_id"] != record["id"] {
		t.Errorf("delete = %v", response)
	}
	handlerstest.ExpectType(t, userConn, "accessChanged")
	if response := aiRequest(t, userConn, "getAccess", ""); response["enabled"] != false {
		t.Errorf("user access after delete = %v", response)
	}

	for event, want := range map[string]int{audit.AIProviderCreated: 2, audit.AIProviderUpdated: 1, audit.AIDefaultChanged: 1, audit.AIProviderDeleted: 1} {
		entries, err := s.C.Repository.AuditLog().FindAuditEntries(ctx, repository.AuditFilters{Event: event}, 1)
		if err != nil || entries.Total != want || strings.Contains(handlerstest.Encode(t, entries.Results), "sk-very-secret") || strings.Contains(handlerstest.Encode(t, entries.Results), "ollama-key") {
			t.Errorf("%s audit = %+v, %v", event, entries, err)
		}
	}
}

func TestUnreadableKey(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)

	sealed, err := encryption.EncryptSecret("another AI_ENCRYPTION_KEY", "sk-old")
	if err != nil {
		t.Fatal(err)
	}
	provider, err := s.C.Repository.AI().CreateProvider(ctx, repository.AIProviderData{Name: "Moved", Type: "openai", BaseURL: s.fake.server.URL, Model: "m", APIKey: &sealed})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.C.Repository.AI().SetDefaultProvider(ctx, &provider.Id); err != nil {
		t.Fatal(err)
	}
	id := strconv.FormatInt(provider.Id, 10)

	if records := aiRequest(t, conn, "getProviders", "")["providers"].([]any); records[0].(map[string]any)["key_unreadable"] != true {
		t.Errorf("providers = %v", records)
	}
	if response := aiRequest(t, conn, "testProvider", `,"id":`+id); response["success"] != false || response["message"] != "API key cannot be decrypted, enter it again" {
		t.Errorf("test = %v", response)
	}
	if response := aiRequest(t, conn, "sendMessage", `,"conversation_id":null,"text":"hi"`); response["message"] != unreadableMessage {
		t.Errorf("send = %v", response)
	}

	// Entering the key again fixes it.
	if response := aiRequest(t, conn, "updateProvider", `,"id":`+id+`,"data":{"name":"Moved","type":"openai","base_url":"`+s.fake.server.URL+`","model":"m","api_key":"sk-new"}`); response["record"].(map[string]any)["key_unreadable"] != false {
		t.Errorf("after a new key = %v", response)
	}
	s.fake.replies <- textReply("OK")
	if response := aiRequest(t, conn, "testProvider", `,"id":`+id); response["success"] != true || response["message"] != "The provider answered with OK" {
		t.Errorf("test = %v", response)
	}
	request := s.fake.request(0)
	if tools := request["tools"].([]any); len(tools) != 1 {
		t.Errorf("test request tools = %v", tools)
	}
}

func TestListProviderModels(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	provider := s.addProvider(t, "Main", false)

	s.fake.replies <- `{"data":[{"id":"b"},{"id":"a"}]}`
	response := aiRequest(t, conn, "listProviderModels", `,"provider_id":`+strconv.FormatInt(provider.Id, 10)+`,"provider_type":"openai","base_url":"`+s.fake.server.URL+`","api_key":null`)
	if handlerstest.Encode(t, response["models"]) != `["a","b"]` {
		t.Errorf("models = %v", response)
	}
	if response := aiRequest(t, conn, "listProviderModels", `,"provider_id":null,"provider_type":"openai","base_url":"http://127.0.0.1:1","api_key":"sk"`); !strings.HasPrefix(response["message"].(string), "Could not load models: ") {
		t.Errorf("failure = %v", response)
	}
}

func TestUserAccessSettings(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	user := s.AddUser(t, "user")
	userConn := s.Dial(t, user)
	other := s.AddUser(t, "other")
	main := s.addProvider(t, "Main", true)
	userID := strconv.Itoa(user)

	if response := aiRequest(t, conn, "setUserAccess", `,"user_id":`+userID+`,"access":"provider","provider_id":`+strconv.FormatInt(main.Id, 10)); response["record"].(map[string]any)["access"] != "provider" {
		t.Errorf("set provider = %v", response)
	}
	handlerstest.ExpectType(t, userConn, "accessChanged")
	if response := aiRequest(t, conn, "setUserAccess", `,"user_id":`+strconv.Itoa(other)+`,"access":"none","provider_id":null`); response["type"] != "setUserAccessResponse" {
		t.Errorf("set none = %v", response)
	}
	for body, want := range map[string]string{
		`,"user_id":` + userID + `,"access":"provider","provider_id":999`: providerNotFound,
		`,"user_id":999,"access":"none","provider_id":null`:               "User not found.",
	} {
		if response := aiRequest(t, conn, "setUserAccess", body); response["message"] != want {
			t.Errorf("%s = %v", body, response)
		}
	}
	if response := aiRequest(t, conn, "setUserAccess", `,"user_id":`+userID+`,"access":"maybe","provider_id":null`); response["type"] != "error" {
		t.Errorf("bad access = %v", response)
	}

	got := aiRequest(t, conn, "getUserAccess", `,"user_ids":[1,`+userID+`,`+strconv.Itoa(other)+`]`)
	if want := `[{"access":"default","provider_id":null,"user_id":1},{"access":"provider","provider_id":` + strconv.FormatInt(main.Id, 10) + `,"user_id":` + userID + `},{"access":"none","provider_id":null,"user_id":` + strconv.Itoa(other) + `}]`; handlerstest.Encode(t, got["records"]) != want {
		t.Errorf("access = %s", handlerstest.Encode(t, got["records"]))
	}
	if response := aiRequest(t, conn, "setUserAccess", `,"user_id":`+userID+`,"access":"default","provider_id":null`); response["type"] != "setUserAccessResponse" {
		t.Errorf("back to default = %v", response)
	}
	entries, err := s.C.Repository.AuditLog().FindAuditEntries(context.Background(), repository.AuditFilters{Event: audit.AIAccessChanged}, 1)
	if err != nil || entries.Total != 3 {
		t.Errorf("audit = %+v, %v", entries, err)
	}
}

// Every tool's message reaches a handler: arguments made from each schema's
// required fields go through the whole hub as the admin.
func TestEveryCatalogCallHasAHandler(t *testing.T) {
	s := handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		return []ws.Namespace{
			tree.New(c), groups.New(c), notes.New(c), notifications.New(c), tags.New(c),
			files.New(c), users.New(c), settings.New(c), changes.New(c), New(c),
		}
	})
	conn := s.Dial(t, handlerstest.AdminID)
	for _, tool := range aitools.ForRole("admin") {
		if tool.Browser {
			continue
		}
		call, err := tool.Prepare(aitools.Env{Session: requeststate.Session{Name: "Admin", Timezone: "UTC"}}, minimalArguments(t, tool.Parameters))
		if err != nil || call == nil {
			t.Errorf("%s: call = %+v, %v", tool.Name, call, err)
			continue
		}
		message := map[string]any{}
		for key, value := range call.Payload.(map[string]any) {
			message[key] = value
		}
		message["requestId"], message["namespace"], message["type"] = "tool", call.Namespace, call.Type
		handlerstest.Send(t, conn, handlerstest.Encode(t, message))
		response := handlerstest.Read(t, conn)
		for response["requestId"] != "tool" {
			response = handlerstest.Read(t, conn)
		}
		if response["type"] != call.Expect && (response["type"] != "error" || response["message"] == "No handler found") {
			t.Errorf("%s: %s/%s answered %v", tool.Name, call.Namespace, call.Type, response)
		}
	}
}

func minimalArguments(t *testing.T, schema json.RawMessage) json.RawMessage {
	t.Helper()
	var parsed struct {
		Properties map[string]map[string]any `json:"properties"`
		Required   []string                  `json:"required"`
	}
	if err := json.Unmarshal(schema, &parsed); err != nil {
		t.Fatal(err)
	}
	arguments := map[string]any{}
	for _, name := range parsed.Required {
		property := parsed.Properties[name]
		if values, ok := property["enum"].([]any); ok {
			arguments[name] = values[0]
			continue
		}
		switch property["type"] {
		case "string":
			arguments[name] = "x"
		case "integer":
			arguments[name] = 1
		case "boolean":
			arguments[name] = false
		case "array":
			arguments[name] = []any{}
		default:
			arguments[name] = map[string]any{}
		}
	}
	data, _ := json.Marshal(arguments)
	return data
}
