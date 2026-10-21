package settings

import (
	"context"
	"testing"
	"time"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/eventbus"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func newServer(t *testing.T) *handlerstest.Server {
	return handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		return []ws.Namespace{New(c)}
	})
}

func TestGetPeriodicTasks(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	if err := s.C.Repository.PeriodicTasks().SchedulePeriodicTask(ctx, "check-reminders", 1_800_000_000); err != nil {
		t.Fatal(err)
	}
	if err := s.C.Repository.PeriodicTasks().SavePeriodicTaskRun(ctx, repository.PeriodicTaskRun{TaskIdentifier: "backup-database", NextRunAt: 1_800_000_060, RanAt: 1_799_999_000, FailReason: "S3 offsite: AccessDenied"}); err != nil {
		t.Fatal(err)
	}

	request := `{"requestId":"r","namespace":"settings","type":"getPeriodicTasks"}`
	if response := handlerstest.Request(t, s.Dial(t, s.AddUser(t, "user")), request); response["message"] != "User does not have the required permission: canViewPeriodicTasks" {
		t.Errorf("user = %v", response)
	}

	response := handlerstest.Request(t, s.Dial(t, handlerstest.AdminID), request)
	tasks, _ := response["tasks"].([]any)
	if response["type"] != "getPeriodicTasksResponse" || len(tasks) != 2 {
		t.Fatalf("response = %v", response)
	}
	fresh := tasks[0].(map[string]any)
	if fresh["task_identifier"] != "check-reminders" || fresh["next_run_at"] != float64(1_800_000_000) || fresh["is_last_run_successful"] != nil || fresh["last_fail_reason"] != nil {
		t.Errorf("never run task = %v", fresh)
	}
	failed := tasks[1].(map[string]any)
	if failed["is_last_run_successful"] != false || failed["last_fail_reason"] != "S3 offsite: AccessDenied" || failed["last_fail_run_at"] != float64(1_799_999_000) || failed["last_successful_run_at"] != nil {
		t.Errorf("failed task = %v", failed)
	}
}

func TestRunPeriodicTask(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	if err := s.C.Repository.PeriodicTasks().SchedulePeriodicTask(ctx, "backup-database", 1_900_000_000); err != nil {
		t.Fatal(err)
	}
	var requested []eventbus.PeriodicTaskRunRequested
	s.C.Bus.Subscribe(func(_ context.Context, e eventbus.PeriodicTaskRunRequested) { requested = append(requested, e) })

	request := `{"requestId":"r","namespace":"settings","type":"runPeriodicTask","task_identifier":"backup-database"}`
	if response := handlerstest.Request(t, s.Dial(t, s.AddUser(t, "user")), request); response["message"] != "User does not have the required permission: canRunPeriodicTasks" {
		t.Errorf("user = %v", response)
	}
	admin := s.Dial(t, handlerstest.AdminID)
	if response := handlerstest.Request(t, admin, `{"requestId":"r","namespace":"settings","type":"runPeriodicTask","task_identifier":"unknown"}`); response["message"] != "Periodic task not found." {
		t.Errorf("unknown task = %v", response)
	}

	before := time.Now().Unix()
	response := handlerstest.Request(t, admin, request)
	nextRunAt, _ := response["next_run_at"].(float64)
	if response["type"] != "runPeriodicTaskResponse" || response["task_identifier"] != "backup-database" || int64(nextRunAt) < before+1 || int64(nextRunAt) > time.Now().Unix()+1 {
		t.Fatalf("response = %v", response)
	}
	if len(requested) != 1 || requested[0].Task != "backup-database" || requested[0].NextRunAt != int64(nextRunAt) {
		t.Errorf("requested = %+v", requested)
	}
	schedules, err := s.C.Repository.PeriodicTasks().GetPeriodicTaskSchedules(ctx)
	if err != nil || len(schedules) != 1 || *schedules[0].NextRunAt != int64(nextRunAt) {
		t.Errorf("schedules = %+v, %v", schedules, err)
	}
	entries, err := s.C.Repository.AuditLog().FindAuditEntries(ctx, repository.AuditFilters{Event: audit.PeriodicTaskRunRequested}, 1)
	if err != nil || entries.Total != 1 || entries.Results[0].Details != `{"task":"backup-database"}` {
		t.Errorf("audit = %+v, %v", entries, err)
	}
}

func TestGetPeriodicTaskRuns(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	now := time.Now().Unix()
	for _, run := range []repository.PeriodicTaskRun{
		{TaskIdentifier: "backup-database", RanAt: now - 31*24*3600, Successful: true},
		{TaskIdentifier: "backup-database", RanAt: now - 3600, DurationMs: 420, FailReason: "S3 offsite: AccessDenied"},
		{TaskIdentifier: "backup-database", RanAt: now - 60, DurationMs: 380, Successful: true},
		{TaskIdentifier: "check-reminders", RanAt: now - 60, Successful: true},
	} {
		if err := s.C.Repository.PeriodicTasks().SavePeriodicTaskRun(ctx, run); err != nil {
			t.Fatal(err)
		}
	}

	request := `{"requestId":"r","namespace":"settings","type":"getPeriodicTaskRuns","task_identifier":"backup-database","page":1}`
	if response := handlerstest.Request(t, s.Dial(t, s.AddUser(t, "user")), request); response["message"] != "User does not have the required permission: canViewPeriodicTasks" {
		t.Errorf("user = %v", response)
	}

	conn := s.Dial(t, handlerstest.AdminID)
	response := handlerstest.Request(t, conn, request)
	runs, _ := response["runs"].(map[string]any)
	results, _ := runs["results"].([]any)
	if response["type"] != "getPeriodicTaskRunsResponse" || response["history_days"] != float64(30) || runs["total"] != float64(2) || len(results) != 2 {
		t.Fatalf("response = %v", response)
	}
	newest := results[0].(map[string]any)
	if newest["task_identifier"] != "backup-database" || newest["ran_at"] != float64(now-60) || newest["duration_ms"] != float64(380) || newest["is_successful"] != true || newest["fail_reason"] != nil || newest["id"] == nil {
		t.Errorf("newest = %v", newest)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"settings","type":"getPeriodicTaskRuns","task_identifier":"backup-database","outcome":"failed","page":1}`)
	runs, _ = response["runs"].(map[string]any)
	results, _ = runs["results"].([]any)
	if len(results) != 1 || results[0].(map[string]any)["fail_reason"] != "S3 offsite: AccessDenied" {
		t.Errorf("failed runs = %v", response)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"settings","type":"getPeriodicTaskRuns","task_identifier":"backup-database","outcome":"maybe","page":1}`)
	if response["message"] != "Unknown run outcome." {
		t.Errorf("unknown outcome = %v", response)
	}
}

func TestGetAuditLog(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	s.C.Audit.Record(ctx, audit.LoginFailed, audit.Actor{Address: "10.0.0.1"}, map[string]any{"username": "ghost"})
	s.C.Audit.Record(ctx, audit.LoginSucceeded, audit.Actor{UserID: 1, Username: "admin", Address: "10.0.0.2"}, nil)
	s.C.Audit.Record(ctx, audit.Logout, audit.Actor{UserID: 1, Username: "admin", Address: "10.0.0.2"}, nil)

	request := `{"requestId":"r","namespace":"settings","type":"getAuditLog","filters":{},"page":1}`
	if response := handlerstest.Request(t, s.Dial(t, s.AddUser(t, "user")), request); response["message"] != "User does not have the required permission: canViewAuditLog" {
		t.Errorf("user = %v", response)
	}

	conn := s.Dial(t, handlerstest.AdminID)
	response := handlerstest.Request(t, conn, request)
	records, _ := response["records"].(map[string]any)
	results, _ := records["results"].([]any)
	if response["type"] != "getAuditLogResponse" || records["total"] != float64(3) || records["per_page"] != float64(20) || len(results) != 3 {
		t.Fatalf("response = %v", response)
	}
	if got := handlerstest.Encode(t, response["events"]); got != `["login_failed","login_succeeded","logout"]` {
		t.Errorf("events = %s", got)
	}
	newest := results[0].(map[string]any)
	if newest["event"] != "logout" || newest["user_id"] != float64(1) || newest["username"] != "admin" || newest["address"] != "10.0.0.2" || handlerstest.Encode(t, newest["details"]) != `{}` || newest["created_at"] == nil || newest["id"] == nil {
		t.Errorf("newest = %v", newest)
	}
	anonymous := results[2].(map[string]any)
	if anonymous["event"] != "login_failed" || anonymous["user_id"] != nil || anonymous["username"] != nil || handlerstest.Encode(t, anonymous["details"]) != `{"username":"ghost"}` {
		t.Errorf("anonymous = %v", anonymous)
	}

	filtered := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"settings","type":"getAuditLog","filters":{"event":"login_succeeded","username":"adm"},"page":1}`)
	if filtered["records"].(map[string]any)["total"] != float64(1) {
		t.Errorf("filtered = %v", filtered)
	}
	future := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"settings","type":"getAuditLog","filters":{"from":4102444800},"page":1}`)
	if future["records"].(map[string]any)["total"] != float64(0) {
		t.Errorf("from filter = %v", future)
	}
}

func TestGetServerLog(t *testing.T) {
	s := newServer(t)
	request := `{"requestId":"r","namespace":"settings","type":"getServerLog"}`
	if response := handlerstest.Request(t, s.Dial(t, s.AddUser(t, "user")), request); response["message"] != "User does not have the required permission: canViewServerLog" {
		t.Errorf("user = %v", response)
	}

	conn := s.Dial(t, handlerstest.AdminID)
	if response := handlerstest.Request(t, conn, request); response["type"] != "getServerLogResponse" || handlerstest.Encode(t, response["lines"]) != `[]` {
		t.Errorf("empty log = %v", response)
	}
	s.C.LogBuffer.Write([]byte("first line\n"))
	s.C.LogBuffer.Write([]byte("second line\n"))
	if response := handlerstest.Request(t, conn, request); handlerstest.Encode(t, response["lines"]) != `["first line","second line"]` {
		t.Errorf("log = %v", response)
	}
}
