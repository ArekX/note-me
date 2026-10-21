package settings

import (
	"context"
	"strconv"
	"testing"

	"noteme/internal/components"
	"noteme/internal/eventbus"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/changes"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func TestBackupChangesReachOtherAdmins(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)
	tab := s.Dial(t, handlerstest.AdminID)
	otherAdmin := s.Dial(t, s.AddUserWithRole(t, "other", "admin"))
	userConn := s.Dial(t, s.AddUser(t, "user"))

	response := settingsRequest(t, conn, "createBackupTarget", `,"target":`+localTarget(t, "Local", "shared"))
	if response["type"] != "createBackupTargetResponse" {
		t.Fatalf("create = %v", response)
	}
	id := handlerstest.Encode(t, response["record"].(map[string]any)["id"])
	if other := handlerstest.Read(t, tab); other["type"] != "createBackupTargetResponse" {
		t.Errorf("admin's other tab = %v", other)
	}
	handlerstest.ExpectDataChanged(t, otherAdmin, "backupTarget", "["+id+"]")

	response = settingsRequest(t, conn, "createBackupNow", `,"target_id":`+id)
	identifier := response["result"].(map[string]any)["backup"].(map[string]any)["identifier"].(string)
	if other := handlerstest.Read(t, tab); other["type"] != "createBackupNowResponse" {
		t.Errorf("admin's other tab = %v", other)
	}
	handlerstest.ExpectDataChanged(t, otherAdmin, "backup", `["`+identifier+`"]`)
	handlerstest.ExpectDataChanged(t, otherAdmin, "backupTarget", "["+id+"]")

	// A failed manual backup is only the requester's business.
	targetID, _ := strconv.Atoi(id)
	if claimed, _ := s.C.Repository.BackupTargets().ClaimBackupTarget(ctx, targetID); !claimed {
		t.Fatal("claim failed")
	}
	if response := settingsRequest(t, conn, "createBackupNow", `,"target_id":`+id); response["result"].(map[string]any)["success"] != false {
		t.Errorf("backup while in progress = %v", response)
	}

	if response := settingsRequest(t, userConn, "getBackupTargets", ""); response["type"] != "error" {
		t.Errorf("user got %v before the error", response)
	}
	if response := settingsRequest(t, otherAdmin, "getBackupTargets", ""); response["type"] != "getBackupTargetsResponse" {
		t.Errorf("other admin got %v after the failed backup", response)
	}
}

func TestWorkerChangesReachAdmins(t *testing.T) {
	s := handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		return []ws.Namespace{New(c), changes.New(c)}
	})
	ctx := context.Background()
	admin := s.Dial(t, handlerstest.AdminID)
	userConn := s.Dial(t, s.AddUser(t, "user"))

	s.C.Bus.Publish(ctx, eventbus.PeriodicTaskRan{Task: "check-reminders"})
	handlerstest.ExpectDataChanged(t, admin, "periodicTask", `["check-reminders"]`)

	s.C.Bus.Publish(ctx, eventbus.AutomaticBackupFinished{})
	handlerstest.ExpectDataChanged(t, admin, "backup", "[]")
	handlerstest.ExpectDataChanged(t, admin, "backupTarget", "[]")

	if err := s.C.Repository.PeriodicTasks().SchedulePeriodicTask(ctx, "check-reminders", 1_800_000_000); err != nil {
		t.Fatal(err)
	}
	if response := settingsRequest(t, userConn, "getPeriodicTasks", ""); response["type"] != "error" {
		t.Errorf("user got %v before the error", response)
	}
}

func TestBackupTargetChangesReachEveryTab(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	tab := s.Dial(t, handlerstest.AdminID)

	response := settingsRequest(t, conn, "createBackupTarget", `,"target":`+localTarget(t, "Local", "tabs"))
	id := handlerstest.Encode(t, response["record"].(map[string]any)["id"])
	handlerstest.ExpectType(t, tab, "createBackupTargetResponse")

	response = settingsRequest(t, conn, "createBackupNow", `,"target_id":`+id)
	identifier := response["result"].(map[string]any)["backup"].(map[string]any)["identifier"].(string)
	handlerstest.ExpectType(t, tab, "createBackupNowResponse")

	for _, step := range []struct{ typ, body, want string }{
		{"updateBackupTarget", `,"target_id":` + id + `,"data":` + localTarget(t, "Renamed", "tabs"), "updateBackupTargetResponse"},
		{"deleteBackup", `,"target_id":` + id + `,"identifier":"` + identifier + `"`, "deleteBackupResponse"},
		{"deleteBackupTarget", `,"target_id":` + id, "deleteBackupTargetResponse"},
	} {
		if response := settingsRequest(t, conn, step.typ, step.body); response["type"] != step.want {
			t.Errorf("%s = %v", step.typ, response)
		}
		handlerstest.ExpectType(t, tab, step.want)
	}
}
