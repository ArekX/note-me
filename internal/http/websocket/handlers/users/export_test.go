package users

import (
	"context"
	"testing"

	"noteme/internal/eventbus"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func TestExportOwnData(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "user")
	conn := s.Dial(t, user)
	otherConn := s.Dial(t, s.AddUser(t, "other"))

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"exportOwnData","user_password":"wrong"}`)
	if response["type"] != "error" || response["message"] != invalidPasswordMessage {
		t.Fatalf("wrong password = %v", response)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"exportOwnData","user_password":"password123"}`)
	exportID, _ := response["export_id"].(string)
	jobID, _ := response["job_id"].(string)
	if response["type"] != "exportOwnDataResponse" || exportID == "" || jobID == "" {
		t.Fatalf("export = %v", response)
	}
	job := <-s.C.Jobs.Pending()
	if job.ID != jobID || job.UserID != user {
		t.Errorf("queued job = %+v", job)
	}

	cancel := `{"requestId":"r","namespace":"users","type":"cancelExportOwnData","job_id":"` + jobID + `"}`
	if response := handlerstest.Request(t, otherConn, cancel); response["type"] != "error" || response["message"] != notExportOwnerMessage {
		t.Errorf("cancel by another user = %v", response)
	}
	if job.Context().Err() != nil {
		t.Fatal("job cancelled by another user")
	}
	if response := handlerstest.Request(t, conn, cancel); response["type"] != "cancelExportOwnDataResponse" || response["job_id"] != jobID {
		t.Errorf("cancel = %v", response)
	}
	if job.Context().Err() == nil {
		t.Error("job not cancelled")
	}
}

func TestExportPushesReachTheUser(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "user")
	conn := s.Dial(t, user)
	// The connection is registered once it has answered a request.
	handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"verifyOwnPassword","password":"x"}`)
	ctx := context.Background()

	s.C.Bus.Publish(ctx, eventbus.DataExportUpdated{UserID: user, ExportID: "e", Percentage: 12.5})
	if msg := handlerstest.Read(t, conn); msg["type"] != "exportOwnDataPercentage" || msg["namespace"] != "users" || msg["export_id"] != "e" || msg["percentage"] != 12.5 {
		t.Errorf("percentage = %v", msg)
	}
	s.C.Bus.Publish(ctx, eventbus.DataExportFinished{UserID: user, ExportID: "e"})
	if msg := handlerstest.Read(t, conn); msg["type"] != "exportOwnDataFinished" || msg["export_id"] != "e" {
		t.Errorf("finished = %v", msg)
	}
	s.C.Bus.Publish(ctx, eventbus.DataExportFailed{UserID: user, ExportID: "e", Message: "nope"})
	if msg := handlerstest.Read(t, conn); msg["type"] != "exportOwnDataFailed" || msg["message"] != "nope" {
		t.Errorf("failed = %v", msg)
	}
}
