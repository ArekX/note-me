package aitools

import (
	"encoding/json"
	"errors"
	"regexp"
	"slices"
	"testing"

	"noteme/internal/http/requeststate"
	"noteme/internal/http/validation"
)

// Claude's limit for tool names; OpenAI and Ollama accept the same.
var toolName = regexp.MustCompile(`^[a-z_]{1,64}$`)

func names(tools []Tool) []string {
	result := make([]string, 0, len(tools))
	for _, tool := range tools {
		result = append(result, tool.Name)
	}
	return result
}

func prepare(t *testing.T, name, arguments string) (*Call, error) {
	t.Helper()
	tool, ok := Find("admin", name)
	if !ok {
		t.Fatalf("no tool %s", name)
	}
	return tool.Prepare(Env{Session: requeststate.Session{Name: "Ada", Timezone: "Europe/Paris"}}, json.RawMessage(arguments))
}

func encode(t *testing.T, value any) string {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func TestCatalogDefinitions(t *testing.T) {
	if len(catalog) < 60 {
		t.Fatalf("catalog has %d tools", len(catalog))
	}
	for _, tool := range catalog {
		if !toolName.MatchString(tool.Name) || tool.Title == "" || tool.Description == "" {
			t.Errorf("tool %q: title %q, description %q", tool.Name, tool.Title, tool.Description)
		}
		var schema map[string]any
		if err := json.Unmarshal(tool.Parameters, &schema); err != nil || schema["type"] != "object" || schema["additionalProperties"] != false {
			t.Errorf("%s schema = %s, %v", tool.Name, tool.Parameters, err)
		}
		if tool.Protected != ProtectedNone && !slices.Contains([]string{ProtectedRead, ProtectedWrite, ProtectedProtection}, tool.Protected) {
			t.Errorf("%s protected = %q", tool.Name, tool.Protected)
		}
	}

	update, _ := Find("user", "update_note")
	if got := string(update.Parameters); got != `{"additionalProperties":false,"properties":{"folder_id":{"description":"Folder to move it into; null moves it to the top level","type":["integer","null"]},"id":{"description":"Note id","type":"integer"},"tags":{"description":"New tags without #, replacing the old ones; [] removes them","items":{"type":"string"},"type":"array"},"text":{"description":"New markdown text, replacing the whole text","type":"string"},"title":{"description":"New title","type":"string"}},"required":["id"],"type":"object"}` {
		t.Errorf("update_note schema = %s", got)
	}
	search, _ := Find("user", "search_notes")
	if got := encode(t, json.RawMessage(search.Parameters)); !regexp.MustCompile(`"type":\{"description":"[^"]+","enum":\["general","shared","reminders","recycleBin"\],"type":"string"\}`).MatchString(got) {
		t.Errorf("search_notes schema = %s", got)
	}
}

func TestCatalogFiltersByPermission(t *testing.T) {
	user, admin := names(ForRole("user")), names(ForRole("admin"))
	for _, name := range []string{"find_users", "delete_user", "get_backup_targets", "create_backup_now", "rename_tag", "get_audit_log", "get_periodic_tasks", "run_periodic_task"} {
		if slices.Contains(user, name) || !slices.Contains(admin, name) {
			t.Errorf("%s: user %v, admin %v", name, slices.Contains(user, name), slices.Contains(admin, name))
		}
	}
	for _, name := range []string{"get_tree", "update_note", "set_note_protection", "get_help_topic", "update_profile", "export_my_data"} {
		if !slices.Contains(user, name) {
			t.Errorf("user lacks %s", name)
		}
	}
	if _, ok := Find("user", "delete_user"); ok {
		t.Error("Find returned an admin tool for a user")
	}
	if len(ForRole("unknown")) != len(user) {
		t.Errorf("unknown role sees %d tools", len(ForRole("unknown")))
	}
	for _, name := range []string{"upload_file", "update_password", "import_data", "get_server_log", "verify_password"} {
		if slices.Contains(admin, name) {
			t.Errorf("%s is offered", name)
		}
	}
}

func TestPrepareRejectsBadArguments(t *testing.T) {
	for _, tt := range []struct{ name, arguments, want string }{
		{"get_note", `{"id":"one"}`, `[{"code":"invalid_type","path":["id"],"message":"Invalid input: expected number, received string"}]`},
		{"get_note", `{}`, `[{"code":"invalid_type","path":["id"],"message":"Invalid input: expected number, received undefined"}]`},
		{"get_note", `{"id":1,"extra":true}`, `[{"code":"unrecognized_keys","path":[],"message":"Unrecognized key: \"extra\""}]`},
		{"get_note", `"{id: 1"`, `[{"code":"invalid_type","path":[],"message":"Invalid input: expected object, received string"}]`},
		{"update_note", `{"id":1,"tags":"work"}`, `[{"code":"invalid_type","path":["tags"],"message":"Invalid input: expected array, received string"}]`},
		{"open_note", `{"id":null}`, `[{"code":"invalid_type","path":["id"],"message":"Invalid input: expected number, received null"}]`},
	} {
		_, err := prepare(t, tt.name, tt.arguments)
		var issues validation.Issues
		if !errors.As(err, &issues) || err.Error() != tt.want {
			t.Errorf("%s %s = %v", tt.name, tt.arguments, err)
		}
	}
}

func TestPrepareBuildsMessages(t *testing.T) {
	for _, tt := range []struct{ name, arguments, want string }{
		{"search_notes", `{"query":"plan"}`, `{"namespace":"notes","type":"searchNote","expect":"searchNoteResponse","payload":{"filters":{"query":"plan","type":"general"}}}`},
		{"search_notes", `{"query":"","folder_id":4,"tags":["work"],"type":"shared","after_id":9}`, `{"namespace":"notes","type":"searchNote","expect":"searchNoteResponse","payload":{"filters":{"from_id":9,"group_id":4,"query":"","tags":["work"],"type":"shared"}}}`},
		{"update_note", `{"id":3,"folder_id":null,"tags":[]}`, `{"namespace":"notes","type":"updateNote","expect":"updateNoteResponse","payload":{"data":{"group_id":null,"tags":[]},"id":3}}`},
		{"update_note", `{"id":3,"text":"New"}`, `{"namespace":"notes","type":"updateNote","expect":"updateNoteResponse","payload":{"data":{"text":"New"},"id":3}}`},
		{"create_note", `{"title":"Plan","text":"Text"}`, `{"namespace":"notes","type":"createNote","expect":"createNoteResponse","payload":{"data":{"group_id":null,"is_encrypted":false,"tags":[],"text":"Text","title":"Plan"}}}`},
		{"update_folder", `{"id":2,"parent_id":null}`, `{"namespace":"groups","type":"updateGroup","expect":"updateGroupResponse","payload":{"data":{"parent_id":null},"id":2}}`},
		{"set_reminder", `{"note_id":1,"type":"repeat","interval":2,"unit_value":86400,"repeat_count":3}`, `{"namespace":"notes","type":"setReminder","expect":"setReminderResponse","payload":{"note_id":1,"reminder":{"interval":2,"repeat_count":3,"type":"repeat","unit_value":86400}}}`},
		{"update_profile", `{"timezone":"Asia/Tokyo"}`, `{"namespace":"users","type":"updateProfile","expect":"updateProfileResponse","payload":{"data":{"name":"Ada","timezone":"Asia/Tokyo"}}}`},
		{"update_profile", `{"preferred_editor":"source"}`, `{"namespace":"users","type":"updateProfile","expect":"updateProfileResponse","payload":{"data":{"name":"Ada","preferred_editor":"source","timezone":"Europe/Paris"}}}`},
		{"get_passkeys", `{}`, `{"namespace":"users","type":"getOwnPasskeys","expect":"getOwnPasskeysResponse","payload":{"page":1}}`},
		{"get_notifications", `{}`, `{"namespace":"notifications","type":"getMyNotifications","expect":"notificationsList","payload":{}}`},
		{"run_periodic_task", `{"task":"backup-database"}`, `{"namespace":"settings","type":"runPeriodicTask","expect":"runPeriodicTaskResponse","payload":{"task_identifier":"backup-database"}}`},
		{"create_backup_now", `{"target_id":1}`, `{"namespace":"settings","type":"createBackupNow","expect":"createBackupNowResponse","payload":{"target_id":1},"timeout_ms":1800000}`},
	} {
		call, err := prepare(t, tt.name, tt.arguments)
		if err != nil || encode(t, call) != tt.want {
			t.Errorf("%s %s = %s, %v", tt.name, tt.arguments, encode(t, call), err)
		}
	}

	for _, name := range []string{"open_note", "set_note_protection", "get_profile", "list_help_topics", "get_help_topic", "open_help", "add_passkey", "delete_passkey", "export_my_data"} {
		tool, _ := Find("admin", name)
		if !tool.Browser {
			t.Errorf("%s is not a browser tool", name)
		}
	}
	if call, err := prepare(t, "open_note", `{"id":1}`); call != nil || err != nil {
		t.Errorf("browser tool call = %v, %v", call, err)
	}
	// The password fields of updateProfile are never set.
	if call, err := prepare(t, "update_profile", `{"new_password":"secret123"}`); call != nil || err == nil {
		t.Errorf("profile password = %v, %v", call, err)
	}
}

func TestResultTrimsTheResponse(t *testing.T) {
	search, _ := Find("user", "search_notes")
	result, err := search.Result(json.RawMessage(`{"requestId":"r","namespace":"notes","type":"searchNoteResponse","results":[{"id":1,"note":"plain","is_encrypted":false},{"id":2,"note":"v2:cipher","is_encrypted":true}]}`))
	if err != nil || result != `{"results":[{"id":1,"is_encrypted":false,"note":"plain"},{"id":2,"is_encrypted":true}]}` {
		t.Errorf("search result = %s, %v", result, err)
	}

	open, _ := Find("user", "open_note")
	if result, err := open.Result(json.RawMessage(`"Opened."`)); err != nil || result != `"Opened."` {
		t.Errorf("browser result = %s, %v", result, err)
	}
	get, _ := Find("user", "get_note")
	if _, err := get.Result(json.RawMessage(`not json`)); err == nil {
		t.Error("broken response accepted")
	}
}

// ReadOnly decides what a read only MCP client may run (decision 0.84).
func TestReadOnlyTools(t *testing.T) {
	reading := regexp.MustCompile(`^(get|find|search|list)_`)
	for _, tool := range catalog {
		if tool.ReadOnly != reading.MatchString(tool.Name) && !tool.Browser {
			t.Errorf("%s: ReadOnly = %v", tool.Name, tool.ReadOnly)
		}
		if tool.ReadOnly && tool.Confirm {
			t.Errorf("%s is read only and needs confirmation", tool.Name)
		}
	}
}
