package settings

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/coder/websocket"

	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func settingsRequest(t *testing.T, conn *websocket.Conn, typ, body string) map[string]any {
	t.Helper()
	return handlerstest.Request(t, conn, `{"requestId":"r","namespace":"settings","type":"`+typ+`"`+body+`}`)
}

func localTarget(t *testing.T, name, location string) string {
	t.Helper()
	return `{"name":` + strconv.Quote(name) + `,"type":"local","settings":{"location":` + strconv.Quote(location) + `}}`
}

func TestBackupMessagesRequirePermission(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, s.AddUser(t, "user"))
	for typ, body := range map[string]string{
		"getBackupTargets":   ``,
		"createBackupTarget": `,"target":{}`,
		"updateBackupTarget": `,"target_id":1,"data":{}`,
		"deleteBackupTarget": `,"target_id":1`,
		"getBackups":         `,"target_id":1`,
		"createBackupNow":    `,"target_id":1`,
		"deleteBackup":       `,"target_id":1,"identifier":"a.zip"`,
	} {
		if response := settingsRequest(t, conn, typ, body); response["message"] != "User does not have the required permission: canManageBackups" {
			t.Errorf("%s: response = %v", typ, response)
		}
	}
}

func TestBackupTargetValidation(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)

	invalid := `[{"code":"invalid_union","path":[],"message":"Invalid input"}]`
	for target, want := range map[string]string{
		`{"name":"a","type":"ftp","settings":{}}`:   invalid,
		`{"name":"a","type":"local","settings":{}}`: invalid,
		`{"name":"a","type":"s3","settings":{"bucket":"b","region":"r","prefix":"","credentials":{"type":"nope"}}}`:                                               invalid,
		`{"name":"","type":"local","settings":{"location":""}}`:                                                                                                   `[{"code":"too_small","path":["name"],"message":"Name must be at least 1 character"},{"code":"too_small","path":["settings","location"],"message":"Location must be set."}]`,
		`{"name":"a","type":"local","settings":{"location":"x","extra":1}}`:                                                                                       `[{"code":"unrecognized_keys","path":["settings"],"message":"Unrecognized key: \"extra\""}]`,
		`{"name":"` + strings.Repeat("n", 256) + `","type":"local","settings":{"location":"/etc"}}`:                                                               `[{"code":"too_big","path":["name"],"message":"Name must be at most 255 characters"},{"code":"invalid_format","path":["settings","location"],"message":"Location must be a folder name inside the backup root, not an absolute path."}]`,
		`{"name":"a","type":"local","settings":{"location":"../outside"}}`:                                                                                        `[{"code":"invalid_format","path":["settings","location"],"message":"Location must be a folder name inside the backup root, not an absolute path."}]`,
		`{"name":"a","type":"s3","settings":{"bucket":"","region":"","prefix":"","credentials":{"type":"access_key","access_key_id":"","secret_access_key":""}}}`: `[{"code":"too_small","path":["settings","bucket"],"message":"Bucket name must be at least 1 character"},{"code":"too_small","path":["settings","region"],"message":"Region must be at least 1 character"},{"code":"too_small","path":["settings","credentials","access_key_id"],"message":"Access key ID must be at least 1 character"},{"code":"too_small","path":["settings","credentials","secret_access_key"],"message":"Secret access key must be at least 1 character"}]`,
	} {
		response := settingsRequest(t, conn, "createBackupTarget", `,"target":`+target)
		if response["type"] != "error" || response["message"] != want {
			t.Errorf("target %s: response = %v", target, response)
		}
	}
}

func TestManageBackupTargets(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)

	response := settingsRequest(t, conn, "createBackupTarget", `,"target":`+localTarget(t, "Local", "nested/backups"))
	record, _ := response["record"].(map[string]any)
	if response["type"] != "createBackupTargetResponse" || record["name"] != "Local" {
		t.Fatalf("create = %v", response)
	}
	if _, err := os.Stat(filepath.Join(s.C.Config.BackupDir, "nested", "backups")); err != nil {
		t.Errorf("location not created: %v", err)
	}
	if entries := auditEvents(t, s, audit.BackupTargetCreated); len(entries) != 1 || !strings.Contains(entries[0].Details, `"name":"Local"`) {
		t.Errorf("create audit entries = %+v", entries)
	}

	// A location under a file cannot be created.
	if err := os.WriteFile(filepath.Join(s.C.Config.BackupDir, "blocked"), nil, 0o600); err != nil {
		t.Fatal(err)
	}
	if response := settingsRequest(t, conn, "createBackupTarget", `,"target":`+localTarget(t, "Blocked", "blocked/sub")); response["message"] != setupFailedMessage {
		t.Errorf("blocked location = %v", response)
	}

	s3 := `{"name":"Offsite","type":"s3","settings":{"bucket":"b","region":"eu-west-1","prefix":"noteme","credentials":{"type":"access_key","access_key_id":"AKIA","secret_access_key":"top-secret","ignored":1}}}`
	response = settingsRequest(t, conn, "createBackupTarget", `,"target":`+s3)
	created, _ := response["record"].(map[string]any)
	s3ID := strconv.Itoa(int(created["id"].(float64)))
	if strings.Contains(handlerstest.Encode(t, response), "top-secret") {
		t.Error("create response contains the secret")
	}

	response = settingsRequest(t, conn, "getBackupTargets", ``)
	if response["max_backup_count"] != float64(5) || strings.Contains(handlerstest.Encode(t, response), "top-secret") {
		t.Errorf("targets = %v", response)
	}

	// The form sends the secret back empty when it was not changed.
	update := strings.Replace(strings.Replace(s3, "top-secret", "", 1), "Offsite", "Offsite renamed", 1)
	response = settingsRequest(t, conn, "updateBackupTarget", `,"target_id":`+s3ID+`,"data":`+update)
	if response["type"] != "updateBackupTargetResponse" {
		t.Fatalf("update = %v", response)
	}
	stored, _ := s.C.Repository.BackupTargets().GetBackupTarget(ctx, int(created["id"].(float64)))
	if stored.Name != "Offsite renamed" || !strings.Contains(stored.Settings, `"secret_access_key":"top-secret"`) || strings.Contains(stored.Settings, "ignored") {
		t.Errorf("stored target = %+v", stored)
	}

	if claimed, _ := s.C.Repository.BackupTargets().ClaimBackupTarget(ctx, stored.Id); !claimed {
		t.Fatal("claim failed")
	}
	if response := settingsRequest(t, conn, "updateBackupTarget", `,"target_id":`+s3ID+`,"data":`+update); response["message"] != updateInProgressMessage {
		t.Errorf("update in progress = %v", response)
	}
	if response := settingsRequest(t, conn, "deleteBackupTarget", `,"target_id":`+s3ID); response["message"] != deleteInProgressMessage {
		t.Errorf("delete in progress = %v", response)
	}
	if err := s.C.Repository.BackupTargets().ReleaseBackupTarget(ctx, stored.Id, false); err != nil {
		t.Fatal(err)
	}
	if response := settingsRequest(t, conn, "deleteBackupTarget", `,"target_id":`+s3ID); response["type"] != "deleteBackupTargetResponse" {
		t.Errorf("delete = %v", response)
	}
	if response := settingsRequest(t, conn, "getBackups", `,"target_id":`+s3ID); response["message"] != targetNotFoundMessage {
		t.Errorf("deleted target = %v", response)
	}
	for _, event := range []string{audit.BackupTargetUpdated, audit.BackupTargetDeleted} {
		if entries := auditEvents(t, s, event); len(entries) != 1 || strings.Contains(entries[0].Details, "top-secret") {
			t.Errorf("%s audit entries = %+v", event, entries)
		}
	}
}

func auditEvents(t *testing.T, s *handlerstest.Server, event string) []repository.AuditRecord {
	t.Helper()
	entries, err := s.C.Repository.AuditLog().FindAuditEntries(context.Background(), repository.AuditFilters{Event: event}, 1)
	if err != nil {
		t.Fatal(err)
	}
	return entries.Results
}

// Target errors stay in the log (SF-24).
func TestBackupErrorsAreNotForwarded(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	target, err := s.C.Repository.BackupTargets().CreateBackupTarget(context.Background(), repository.BackupTargetData{Name: "Broken", Type: "local", Settings: `{"location":"/outside"}`})
	if err != nil {
		t.Fatal(err)
	}
	id := strconv.Itoa(target.Id)

	if response := settingsRequest(t, conn, "getBackups", `,"target_id":`+id); response["message"] != listFailedMessage {
		t.Errorf("list = %v", response)
	}
	if response := settingsRequest(t, conn, "deleteBackup", `,"target_id":`+id+`,"identifier":"a.zip"`); response["message"] != deleteFailedMessage {
		t.Errorf("delete = %v", response)
	}
	response := settingsRequest(t, conn, "createBackupNow", `,"target_id":`+id)
	if result, _ := response["result"].(map[string]any); result["success"] != false || result["message"] != backupFailedMessage {
		t.Errorf("create = %v", response)
	}
}

func TestManualBackups(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)
	location := filepath.Join(s.C.Config.BackupDir, "manual")
	target, err := s.C.Repository.BackupTargets().CreateBackupTarget(ctx, repository.BackupTargetData{Name: "Local", Type: "local", Settings: `{"location":"manual"}`})
	if err != nil {
		t.Fatal(err)
	}
	id := strconv.Itoa(target.Id)

	response := settingsRequest(t, conn, "createBackupNow", `,"target_id":`+id)
	result, _ := response["result"].(map[string]any)
	backup, _ := result["backup"].(map[string]any)
	identifier, _ := backup["identifier"].(string)
	if response["type"] != "createBackupNowResponse" || result["success"] != true || !strings.HasPrefix(identifier, "manual-") {
		t.Fatalf("manual backup = %v", response)
	}
	if stored, _ := s.C.Repository.BackupTargets().GetBackupTarget(ctx, target.Id); stored.LastBackupAt == nil {
		t.Error("last backup time not set")
	}

	response = settingsRequest(t, conn, "getBackups", `,"target_id":`+id)
	backups, _ := response["backups"].([]any)
	if len(backups) != 1 || backups[0].(map[string]any)["identifier"] != identifier {
		t.Errorf("backups = %v", response)
	}

	if claimed, _ := s.C.Repository.BackupTargets().ClaimBackupTarget(ctx, target.Id); !claimed {
		t.Fatal("claim failed")
	}
	response = settingsRequest(t, conn, "createBackupNow", `,"target_id":`+id)
	if result := response["result"].(map[string]any); result["success"] != false || result["message"] != backupInProgressMessage {
		t.Errorf("backup while in progress = %v", response)
	}
	if response := settingsRequest(t, conn, "createBackupNow", `,"target_id":999`); response["result"].(map[string]any)["message"] != targetNotFoundMessage {
		t.Errorf("missing target = %v", response)
	}

	if response := settingsRequest(t, conn, "deleteBackup", `,"target_id":`+id+`,"identifier":".."`); response["message"] != `[{"code":"invalid_format","path":["name"],"message":"Invalid string: must match pattern /^[a-zA-Z0-9.-]+$/"}]` {
		t.Errorf("unsafe identifier = %v", response)
	}
	response = settingsRequest(t, conn, "deleteBackup", `,"target_id":`+id+`,"identifier":`+strconv.Quote(identifier))
	if response["type"] != "deleteBackupResponse" {
		t.Fatalf("delete backup = %v", response)
	}
	if entries, _ := os.ReadDir(location); len(entries) != 0 {
		t.Errorf("backup files left: %v", entries)
	}
	for _, event := range []string{audit.BackupCreated, audit.BackupDeleted} {
		if entries := auditEvents(t, s, event); len(entries) != 1 || !strings.Contains(entries[0].Details, `"identifier":"`+identifier+`"`) {
			t.Errorf("%s audit entries = %+v", event, entries)
		}
	}
}
