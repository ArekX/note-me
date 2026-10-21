package users

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/loginguard"
	"noteme/internal/components/repository"
	"noteme/internal/config"
	ws "noteme/internal/http/websocket"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func namespaces(c *components.Components) []ws.Namespace {
	return []ws.Namespace{New(c)}
}

func newServer(t *testing.T) *handlerstest.Server {
	return handlerstest.New(t, namespaces)
}

func auditEvents(t *testing.T, s *handlerstest.Server, event string) []repository.AuditRecord {
	t.Helper()
	entries, err := s.C.Repository.AuditLog().FindAuditEntries(context.Background(), repository.AuditFilters{Event: event}, 1)
	if err != nil {
		t.Fatal(err)
	}
	return entries.Results
}

func expectLoggedOut(t *testing.T, conn *websocket.Conn) {
	t.Helper()
	if msg := handlerstest.Read(t, conn); msg["type"] != "forceLogoutResponse" || msg["namespace"] != "users" {
		t.Errorf("message = %v, want forceLogoutResponse", msg)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, _, err := conn.Read(ctx); websocket.CloseStatus(err) != websocket.StatusPolicyViolation {
		t.Errorf("connection not closed: %v", err)
	}
}

func TestVerifyOwnPassword(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, s.AddUser(t, "user"))

	for password, want := range map[string]bool{"password123": true, "wrong": false} {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"verifyOwnPassword","password":"`+password+`"}`)
		if response["type"] != "verifyOwnPasswordResponse" || response["verified"] != want {
			t.Errorf("password %q: response = %v", password, response)
		}
	}
}

func TestEncryptAndDecryptText(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "user")
	conn := s.Dial(t, user)
	otherConn := s.Dial(t, s.AddUser(t, "other"))

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"encryptText","text":"secret plan","password":"password123"}`)
	encrypted, _ := response["encrypted"].(string)
	if response["type"] != "encryptTextResponse" || !strings.HasPrefix(encrypted, "v2:") || strings.Contains(encrypted, "secret") {
		t.Fatalf("encrypt = %v", response)
	}

	response = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"decryptText","encrypted":"`+encrypted+`","password":"password123"}`)
	if response["type"] != "decryptTextResponse" || response["text"] != "secret plan" {
		t.Errorf("decrypt = %v", response)
	}

	wrongPassword := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"decryptText","encrypted":"`+encrypted+`","password":"nope"}`)
	otherUser := handlerstest.Request(t, otherConn, `{"requestId":"r","namespace":"users","type":"decryptText","encrypted":"`+encrypted+`","password":"password123"}`)
	for name, response := range map[string]map[string]any{"wrong password": wrongPassword, "other user": otherUser} {
		if response["type"] != "error" || response["message"] != decryptMessage {
			t.Errorf("%s: response = %v", name, response)
		}
	}

	oldValue := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"decryptText","encrypted":"c2FsdA==","password":"password123"}`)
	if oldValue["message"] != unconvertedMessage {
		t.Errorf("old note value = %v", oldValue)
	}

	if _, err := s.C.DB.ExecContext(context.Background(), `UPDATE "user" SET "encryption_key" = 'b2xk' WHERE "id" = ?`, user); err != nil {
		t.Fatal(err)
	}
	oldKey := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"encryptText","text":"x","password":"password123"}`)
	if oldKey["message"] != oldFormatMessage {
		t.Errorf("old key = %v", oldKey)
	}
}

func TestFindPickUsers(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	for _, name := range []string{"marko", "marija", "mira"} {
		s.AddUser(t, name)
	}

	short := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"findPickUsers","filters":{"name":" m "},"page":1}`)
	if got := handlerstest.Encode(t, short["records"]); got != `{"page":1,"per_page":5,"results":[],"total":0}` {
		t.Errorf("short query = %s", got)
	}

	found := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"findPickUsers","filters":{"name":"mar","exclude_user_ids":[1,2]},"page":1}`)
	if got := handlerstest.Encode(t, found["records"]); got != `{"page":1,"per_page":5,"results":[{"id":3,"name":"marija","username":"marija"}],"total":1}` {
		t.Errorf("found = %s", got)
	}
}

func TestUpdateProfileValidation(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, s.AddUser(t, "user"))

	refinement := `{"code":"custom","path":["new_password"],"message":"New password must match confirm password and must be at least 8 characters."},{"code":"custom","path":["confirm_password"],"message":"Confirm password must match new password and must be at least 8 characters."}`
	tests := map[string]string{
		`{"name":"a","timezone":"UTC","old_password":"x","new_password":"short","confirm_password":"short"}`:                       `[{"code":"too_small","path":["new_password"],"message":"Password must have at least 8 characters"},{"code":"too_small","path":["confirm_password"],"message":"Password must have at least 8 characters"},` + refinement + `]`,
		`{"name":"a","timezone":"UTC","old_password":"x","new_password":"longenough1","confirm_password":"longenough2"}`:           `[` + refinement + `]`,
		`{"name":"","timezone":"Mars/Base","old_password":"x"}`:                                                                    `[{"code":"too_small","path":["name"],"message":"Name must have at least one character"},{"code":"invalid_value","path":["timezone"],"message":"Invalid option: expected one of the supported timezones"}]`,
		`{"name":"a","timezone":"UTC","old_password":"password123","new_password":"password123","confirm_password":"password123"}`: "New password must be different from the old password.",
		`{"name":"a","timezone":"UTC","old_password":"wrong","new_password":"newpassword","confirm_password":"newpassword"}`:       "Old password is incorrect",
		`{"name":"a","timezone":"UTC","new_password":"newpassword","confirm_password":"newpassword"}`:                              `[{"code":"custom","path":["old_password"],"message":"Old password is required to change the password."}]`,
		`{"name":"a","timezone":"UTC","preferred_editor":"word","old_password":"x"}`:                                               `[{"code":"invalid_value","path":["preferred_editor"],"message":"Invalid option: expected one of \"rich\"|\"source\""}]`,
		`{"name":"a","timezone":"UTC","old_password":"","new_password":"newpassword"}`:                                             `[{"code":"too_small","path":["old_password"],"message":"Too small: expected string to have >=1 characters"},{"code":"custom","path":["old_password"],"message":"Old password is required to change the password."}]`,
	}
	for data, want := range tests {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateProfile","data":`+data+`}`)
		if response["type"] != "error" || response["message"] != want {
			t.Errorf("%s: response = %v", data, response)
		}
	}
}

func TestProfileAndPasswordLengths(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, s.AddUser(t, "user"))
	long := strings.Repeat("x", 129)

	response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateProfile","data":{"name":"`+strings.Repeat("n", 256)+`","timezone":"UTC","old_password":"`+long+`","new_password":"`+long+`","confirm_password":"`+long+`"}}`)
	want := `[{"code":"too_big","path":["name"],"message":"Name must have at most 255 characters"},{"code":"too_big","path":["old_password"],"message":"Password must have at most 128 characters"},{"code":"too_big","path":["new_password"],"message":"Password must have at most 128 characters"},{"code":"too_big","path":["confirm_password"],"message":"Password must have at most 128 characters"}]`
	if response["message"] != want {
		t.Errorf("profile = %v", response)
	}
}

func TestUpdateProfile(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "user")
	conn := s.Dial(t, user)
	otherTab := s.Dial(t, user)
	phone := s.DialSession(t, user, "phone")

	encrypted := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"encryptText","text":"secret","password":"password123"}`)["encrypted"].(string)

	// Every tab, the requesting one too, gets the session push before the
	// response.
	session := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateProfile","data":{"name":"New Name","timezone":"Europe/Belgrade","old_password":"password123","new_password":"newpassword","confirm_password":"newpassword"}}`)
	response := handlerstest.Read(t, conn)
	if session["type"] != "sessionUpdated" || response["type"] != "updateProfileResponse" || handlerstest.Encode(t, response["data"]) != `{"name":"New Name","timezone":"Europe/Belgrade"}` {
		t.Errorf("echo = %v", response)
	}

	pushed := handlerstest.Read(t, otherTab)
	user1 := pushed["user"].(map[string]any)
	if pushed["type"] != "sessionUpdated" || user1["name"] != "New Name" || user1["timezone"] != "Europe/Belgrade" || user1["preferred_editor"] != "rich" {
		t.Errorf("session push = %v", pushed)
	}

	// The other browser session ends with the password change (SF-03).
	expectLoggedOut(t, phone)
	ctx := context.Background()
	if exists, _ := s.C.Repository.Sessions().SessionExists(ctx, "phone"); exists {
		t.Error("other session row kept")
	}
	if exists, _ := s.C.Repository.Sessions().SessionExists(ctx, "session-"+handlerstest.Encode(t, user)); !exists {
		t.Error("own session row deleted")
	}
	if entries := auditEvents(t, s, audit.PasswordChanged); len(entries) != 1 || entries[0].UserId == nil || *entries[0].UserId != user {
		t.Errorf("audit entries = %+v", entries)
	}

	if ok, _ := s.C.Repository.Users().ValidateUserPassword(context.Background(), user, "newpassword"); !ok {
		t.Error("new password not saved")
	}
	decrypted := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"decryptText","encrypted":"`+encrypted+`","password":"newpassword"}`)
	if decrypted["text"] != "secret" {
		t.Errorf("protected text after password change = %v", decrypted)
	}

	session = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateProfile","data":{"name":"New Name","timezone":"Europe/Belgrade","preferred_editor":"source"}}`)
	response = handlerstest.Read(t, conn)
	if session["user"].(map[string]any)["preferred_editor"] != "source" || handlerstest.Encode(t, response["data"]) != `{"name":"New Name","preferred_editor":"source","timezone":"Europe/Belgrade"}` {
		t.Errorf("editor change = %v, %v", session, response)
	}
}

func TestPasswordChecksLockAfterRepeatedFailures(t *testing.T) {
	s := handlerstest.NewWithConfig(t, func(cfg *config.Config) { cfg.MaxPasswordAttempts = 3 }, namespaces)
	user := s.AddUser(t, "user")
	conn := s.Dial(t, user)
	otherConn := s.Dial(t, s.AddUser(t, "other"))

	verify := func(conn *websocket.Conn, password string) map[string]any {
		return handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"verifyOwnPassword","password":"`+password+`"}`)
	}

	// A correct password clears the count.
	verify(conn, "wrong")
	verify(conn, "wrong")
	if response := verify(conn, "password123"); response["verified"] != true {
		t.Fatalf("correct password = %v", response)
	}
	verify(conn, "wrong")
	if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"decryptText","encrypted":"v2:x","password":"wrong"}`); response["message"] != decryptMessage {
		t.Fatalf("wrong note password = %v", response)
	}
	if response := verify(conn, "wrong"); response["verified"] != false {
		t.Fatalf("third failure = %v", response)
	}

	locked := map[string]string{
		"verifyOwnPassword":             `,"password":"password123"`,
		"encryptText":                   `,"text":"x","password":"password123"`,
		"decryptText":                   `,"encrypted":"v2:x","password":"password123"`,
		"exportOwnData":                 `,"user_password":"password123"`,
		"updateProfile":                 `,"data":{"name":"a","timezone":"UTC","old_password":"password123","new_password":"newpassword","confirm_password":"newpassword"}`,
		"getPasskeyRegistrationOptions": `,"password":"password123"`,
	}
	for typ, body := range locked {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"`+typ+`"`+body+`}`)
		if response["type"] != "error" || response["message"] != loginguard.PasswordLockedMessage {
			t.Errorf("%s while locked = %v", typ, response)
		}
	}
	if response := verify(otherConn, "password123"); response["verified"] != true {
		t.Errorf("other user = %v", response)
	}
	if entries := auditEvents(t, s, audit.PasswordAttemptsLocked); len(entries) != 1 || entries[0].UserId == nil || *entries[0].UserId != user || entries[0].Username != "user" {
		t.Errorf("audit entries = %+v", entries)
	}
}

func addFile(t *testing.T, s *handlerstest.Server, userID int, identifier, mimeType string, ready bool) {
	t.Helper()
	ctx := context.Background()
	if err := s.C.Repository.Files().CreateFileRecord(ctx, repository.NewFileRecord{Identifier: identifier, Name: identifier, UserId: userID, MimeType: mimeType, Size: 1}); err != nil {
		t.Fatal(err)
	}
	if !ready {
		return
	}
	if err := s.C.Repository.Files().MarkFileReady(ctx, identifier); err != nil {
		t.Fatal(err)
	}
}

func TestUpdateProfilePicture(t *testing.T) {
	s := newServer(t)
	user := s.AddUser(t, "user")
	other := s.AddUser(t, "other")
	conn := s.Dial(t, user)
	otherTab := s.Dial(t, user)
	addFile(t, s, user, "photo", "image/png", true)
	addFile(t, s, user, "notes", "text/plain", true)
	addFile(t, s, user, "uploading", "image/png", false)
	addFile(t, s, other, "foreign", "image/png", true)

	for identifier, want := range map[string]string{
		"missing":   "File not found.",
		"uploading": "File not found.",
		"foreign":   "File not found.",
		"notes":     "Profile picture must be an image.",
	} {
		response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateProfilePicture","identifier":"`+identifier+`"}`)
		if response["message"] != want {
			t.Errorf("%s: response = %v", identifier, response)
		}
	}

	session := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateProfilePicture","identifier":"photo"}`)
	response := handlerstest.Read(t, conn)
	if session["type"] != "sessionUpdated" || session["user"].(map[string]any)["profile_picture"] != "photo" || response["type"] != "updateProfilePictureResponse" || response["identifier"] != "photo" {
		t.Errorf("set = %v, %v", session, response)
	}
	if pushed := handlerstest.Read(t, otherTab); pushed["user"].(map[string]any)["profile_picture"] != "photo" {
		t.Errorf("other tab = %v", pushed)
	}

	session = handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"updateProfilePicture","identifier":null}`)
	response = handlerstest.Read(t, conn)
	if picture, ok := session["user"].(map[string]any)["profile_picture"]; !ok || picture != nil || response["identifier"] != nil {
		t.Errorf("remove = %v, %v", session, response)
	}
}
