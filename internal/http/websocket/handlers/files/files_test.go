package files

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/coder/websocket"

	"noteme/internal/components"
	"noteme/internal/components/repository"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

const (
	maxFileSize    = 16
	maxStorageSize = 20
)

func newServer(t *testing.T) *handlerstest.Server {
	return handlerstest.New(t, func(c *components.Components) []ws.Namespace {
		c.Config.MaxFileSize = maxFileSize
		c.Config.MaxUserStorageSize = maxStorageSize
		return []ws.Namespace{New(c)}
	})
}

func begin(t *testing.T, conn *websocket.Conn, name string, size int) string {
	t.Helper()
	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"beginFile","name":`+handlerstest.Encode(t, name)+`,"size":`+handlerstest.Encode(t, size)+`,"mime_type":"text/plain"}`)
	target, ok := response["target_id"].(string)
	if !ok {
		t.Fatalf("begin = %v", response)
	}
	return target
}

func send(t *testing.T, conn *websocket.Conn, target string, data string) map[string]any {
	t.Helper()
	handlerstest.SendBinary(t, conn, `{"requestId":"r","namespace":"files","type":"sendFileData","target_id":"`+target+`"}`, []byte(data))
	return handlerstest.Read(t, conn)
}

func end(t *testing.T, conn *websocket.Conn, target string) map[string]any {
	t.Helper()
	return handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"endFile","target_id":"`+target+`"}`)
}

func TestUpload(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)

	target := begin(t, conn, "notes/draft?.txt", 11)
	for _, chunk := range []string{"hello ", "world"} {
		if response := send(t, conn, target, chunk); response["type"] != "sendFileDataResponse" {
			t.Fatalf("send = %v", response)
		}
	}
	if response := end(t, conn, target); response["type"] != "endFileResponse" {
		t.Fatalf("end = %v", response)
	}

	data, err := os.ReadFile(filepath.Join(s.C.Config.FilesDir, target))
	if err != nil || string(data) != "hello world" {
		t.Errorf("stored = %q, %v", data, err)
	}
	if entries, _ := os.ReadDir(s.C.Config.TempDir); len(entries) != 0 {
		t.Errorf("temp folder has %d entries", len(entries))
	}

	details := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"getFileDetails","identifiers":["`+target+`"]}`)
	record := details["records"].([]any)[0].(map[string]any)
	if record["name"] != "notes-draft-.txt" || record["size"] != float64(11) || record["is_public"] != false || record["created_by"] != "Administrator" {
		t.Errorf("record = %v", record)
	}

	if response := end(t, conn, target); response["message"] != fileNotFound {
		t.Errorf("second end = %v", response)
	}
	if response := send(t, conn, target, "more"); response["message"] != fileNotFound {
		t.Errorf("send after end = %v", response)
	}
}

func TestUploadLimitsAndMismatch(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	otherConn := s.Dial(t, s.AddUser(t, "other"))

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"beginFile","name":"big","size":17,"mime_type":"a"}`); response["message"] != overLimit {
		t.Errorf("declared too big = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"beginFile","name":"???","size":1,"mime_type":"a"}`); response["type"] != "beginFileResponse" {
		t.Errorf("sanitised name = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"beginFile","name":"","size":1,"mime_type":"a"}`); response["message"] != `[{"code":"too_small","path":["name"],"message":"Name must be at least 1 character long"},{"code":"invalid_format","path":["name"],"message":"Name must only contain letters, numbers, dots, spaces, hyphens, and underscores."}]` {
		t.Errorf("empty name = %v", response)
	}

	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"beginFile","name":"a","size":1,"mime_type":"`+strings.Repeat("a", 256)+`"}`); response["message"] != `[{"code":"too_big","path":["mime_type"],"message":"MIME type must have at most 255 characters"}]` {
		t.Errorf("long mime type = %v", response)
	}

	target := begin(t, conn, "a.txt", 10)
	if response := send(t, otherConn, target, "x"); response["message"] != fileNotFound {
		t.Errorf("foreign chunk = %v", response)
	}
	if response := send(t, conn, target, "0123456789abcdefg"); response["message"] != overLimit {
		t.Errorf("chunk over the limit = %v", response)
	}
	if size, err := s.C.Storage.TempFileSize("1", target); err != nil || size != 0 {
		t.Errorf("temp size after refused chunk = %d, %v", size, err)
	}

	send(t, conn, target, "short")
	if response := end(t, conn, target); response["message"] != sizeMismatch {
		t.Errorf("mismatch = %v", response)
	}
	if upload, _ := s.C.Repository.Files().GetFileUploadForUser(context.Background(), handlerstest.AdminID, target); upload != nil {
		t.Errorf("record kept after mismatch: %+v", upload)
	}
	if _, err := s.C.Storage.TempFileSize("1", target); err == nil {
		t.Error("temp file kept after mismatch")
	}
}

func TestFileManagement(t *testing.T) {
	s := newServer(t)
	admin := s.Dial(t, handlerstest.AdminID)
	user := s.AddUser(t, "user")
	userConn := s.Dial(t, user)

	upload := func(conn *websocket.Conn, name string) string {
		target := begin(t, conn, name, 4)
		send(t, conn, target, "data")
		end(t, conn, target)
		return target
	}
	adminFile := upload(admin, "admin.txt")
	userFile := upload(userConn, "user.txt")
	handlerstest.ExpectDataChanged(t, admin, "file", `["`+userFile+`"]`)

	userFiles := handlerstest.Request(t, userConn, `{"requestId":"r","namespace":"files","type":"findFiles","filters":{"allFiles":true}}`)
	if records := userFiles["records"].(map[string]any); records["total"] != float64(1) {
		t.Errorf("user asking for all files = %v", records)
	}
	allFiles := handlerstest.Request(t, admin, `{"requestId":"r","namespace":"files","type":"findFiles","filters":{"allFiles":true},"page":1}`)
	if records := allFiles["records"].(map[string]any); records["total"] != float64(2) {
		t.Errorf("admin all files = %v", records)
	}
	byOwner := handlerstest.Request(t, admin, `{"requestId":"r","namespace":"files","type":"findFiles","filters":{"allFiles":true,"owner":"user","kind":"document","visibility":"private"}}`)
	if records := byOwner["records"].(map[string]any); records["total"] != float64(1) {
		t.Errorf("admin files filtered by owner, kind and visibility = %v", records)
	}
	images := handlerstest.Request(t, admin, `{"requestId":"r","namespace":"files","type":"findFiles","filters":{"allFiles":true,"kind":"image"}}`)
	if records := images["records"].(map[string]any); records["total"] != float64(0) {
		t.Errorf("admin image files = %v", records)
	}

	handlerstest.Request(t, userConn, `{"requestId":"r","namespace":"files","type":"updateFile","identifier":"`+adminFile+`","is_public":true}`)
	handlerstest.ExpectDataChanged(t, admin, "file", `["`+adminFile+`"]`)
	if data, _ := s.C.Repository.Files().GetFileData(context.Background(), adminFile); data.IsPublic {
		t.Error("user changed the admin's file")
	}
	handlerstest.Request(t, admin, `{"requestId":"r","namespace":"files","type":"updateFile","identifier":"`+userFile+`","is_public":true}`)
	handlerstest.ExpectDataChanged(t, userConn, "file", `["`+userFile+`"]`)
	if data, _ := s.C.Repository.Files().GetFileData(context.Background(), userFile); !data.IsPublic {
		t.Error("admin could not change the user's file")
	}

	tests := map[string]string{
		`{"identifiers":["a"],"data":{"is_public":true,"x":1}}`: `[{"code":"unrecognized_keys","path":["data"],"message":"Unrecognized key: \"x\""}]`,
		`{"identifiers":"a","data":{}}`:                         `[{"code":"invalid_type","path":["identifiers"],"message":"Invalid input: expected array, received string"}]`,
		`{"identifiers":["a"]}`:                                 `[{"code":"invalid_type","path":["data"],"message":"Invalid input: expected object, received undefined"}]`,
	}
	for data, want := range tests {
		if response := handlerstest.Request(t, userConn, `{"requestId":"r","namespace":"files","type":"updateMultipleFiles","data":`+data+`}`); response["message"] != want {
			t.Errorf("%s: %v", data, response)
		}
	}
	multiple := handlerstest.Request(t, userConn, `{"requestId":"r","namespace":"files","type":"updateMultipleFiles","data":{"identifiers":["`+userFile+`"],"data":{"is_public":false}}}`)
	if multiple["type"] != "updateMultipleFilesResponse" {
		t.Errorf("multiple = %v", multiple)
	}
	handlerstest.ExpectDataChanged(t, admin, "file", `["`+userFile+`"]`)
	if data, _ := s.C.Repository.Files().GetFileData(context.Background(), userFile); data.IsPublic {
		t.Error("multiple update did not apply")
	}

	handlerstest.Request(t, userConn, `{"requestId":"r","namespace":"files","type":"deleteFile","identifier":"`+adminFile+`"}`)
	if _, err := os.Stat(filepath.Join(s.C.Config.FilesDir, adminFile)); err != nil {
		t.Error("user deleted the admin's file")
	}
	deleted := handlerstest.Request(t, admin, `{"requestId":"r","namespace":"files","type":"deleteFile","identifier":"`+userFile+`"}`)
	if deleted["type"] != "deleteFileResponse" || deleted["identifier"] != userFile {
		t.Errorf("delete = %v", deleted)
	}
	handlerstest.ExpectDataChanged(t, userConn, "file", `["`+userFile+`"]`)
	if _, err := os.Stat(filepath.Join(s.C.Config.FilesDir, userFile)); !os.IsNotExist(err) {
		t.Error("deleted file still on disk")
	}

	entries, err := s.C.Repository.AuditLog().FindAuditEntries(context.Background(), repository.AuditFilters{}, 1)
	if err != nil || entries.Total != 2 {
		t.Fatalf("audit entries = %+v, %v", entries, err)
	}
	if got := entries.Results[0]; got.Event != "file_deleted_by_admin" || got.Details != `{"identifier":"`+userFile+`","owner":`+handlerstest.Encode(t, user)+`}` {
		t.Errorf("delete audit = %+v", got)
	}
	if got := entries.Results[1]; got.Event != "file_visibility_changed_by_admin" || got.Details != `{"identifier":"`+userFile+`","is_public":true,"owner":`+handlerstest.Encode(t, user)+`}` {
		t.Errorf("visibility audit = %+v", got)
	}
}

func TestStorageQuota(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	otherConn := s.Dial(t, s.AddUser(t, "other"))

	begin(t, conn, "first", 16)
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"beginFile","name":"second","size":5,"mime_type":"a"}`); response["message"] != quotaExceeded {
		t.Errorf("over quota = %v", response)
	}
	begin(t, conn, "second", 4)
	begin(t, otherConn, "theirs", 16)
}

func TestIdentifierLimits(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)

	identifiers := "[" + strings.TrimSuffix(strings.Repeat(`"a",`, 101), ",") + "]"
	want := `[{"code":"too_big","path":["identifiers"],"message":"Too big: expected array to have <=100 items"}]`
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"getFileDetails","identifiers":`+identifiers+`}`); response["message"] != want {
		t.Errorf("details = %v", response)
	}
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files","type":"updateMultipleFiles","data":{"identifiers":`+identifiers+`,"data":{"is_public":true}}}`); response["message"] != want {
		t.Errorf("multiple = %v", response)
	}
}

func TestFileChangesReachEveryTab(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	tab := s.Dial(t, handlerstest.AdminID)

	target := begin(t, conn, "a.txt", 4)
	send(t, conn, target, "data")
	end(t, conn, target)
	handlerstest.ExpectType(t, tab, "endFileResponse")

	for _, step := range []struct{ message, want string }{
		{`"type":"updateFile","identifier":"` + target + `","is_public":true`, "updateFileResponse"},
		{`"type":"updateMultipleFiles","data":{"identifiers":["` + target + `"],"data":{"is_public":false}}`, "updateMultipleFilesResponse"},
		{`"type":"deleteFile","identifier":"` + target + `"`, "deleteFileResponse"},
	} {
		if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"files",`+step.message+`}`); response["type"] != step.want {
			t.Errorf("%s = %v", step.message, response)
		}
		handlerstest.ExpectType(t, tab, step.want)
	}
}

func TestDeletingProfilePictureRemovesIt(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	admin := s.Dial(t, handlerstest.AdminID)
	user := s.AddUser(t, "user")
	userConn := s.Dial(t, user)

	upload := func(name string) string {
		target := begin(t, userConn, name, 4)
		send(t, userConn, target, "data")
		end(t, userConn, target)
		handlerstest.ExpectDataChanged(t, admin, "file", `["`+target+`"]`)
		return target
	}
	picture := func() any {
		t.Helper()
		record, err := s.C.Repository.Users().GetUserById(ctx, user)
		if err != nil {
			t.Fatal(err)
		}
		return record.ProfilePicture
	}

	first := upload("first.png")
	if err := s.C.Repository.Users().UpdateProfilePicture(ctx, user, first); err != nil {
		t.Fatal(err)
	}
	session := handlerstest.Request(t, userConn, `{"requestId":"r","namespace":"files","type":"deleteFile","identifier":"`+first+`"}`)
	if session["type"] != "sessionUpdated" || session["user"].(map[string]any)["profile_picture"] != nil || picture() != "" {
		t.Errorf("own delete = %v", session)
	}
	handlerstest.ExpectType(t, userConn, "deleteFileResponse")
	handlerstest.ExpectDataChanged(t, admin, "file", `["`+first+`"]`)

	second := upload("second.png")
	if err := s.C.Repository.Users().UpdateProfilePicture(ctx, user, second); err != nil {
		t.Fatal(err)
	}
	handlerstest.Request(t, admin, `{"requestId":"r","namespace":"files","type":"deleteFile","identifier":"`+second+`"}`)
	if pushed := handlerstest.ExpectType(t, userConn, "sessionUpdated"); pushed["user"].(map[string]any)["profile_picture"] != nil || picture() != "" {
		t.Errorf("admin delete = %v", pushed)
	}
	handlerstest.ExpectDataChanged(t, userConn, "file", `["`+second+`"]`)
}
