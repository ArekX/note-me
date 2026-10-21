package users

import (
	"context"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"

	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/http/websocket/handlers/handlerstest"
)

func userRequest(t *testing.T, conn *websocket.Conn, typ, body string) map[string]any {
	t.Helper()
	return handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users","type":"`+typ+`"`+body+`}`)
}

func TestUserManagementRequiresPermission(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, s.AddUser(t, "user"))

	for typ, body := range map[string]string{
		"createUser": `,"data":{}`,
		"updateUser": `,"id":1,"data":{}`,
		"deleteUser": `,"id":1`,
		"findUsers":  `,"filters":{},"page":1`,
	} {
		response := userRequest(t, conn, typ, body)
		if response["type"] != "error" || response["message"] != "User does not have the required permission: canUpdateUsers" {
			t.Errorf("%s: response = %v", typ, response)
		}
	}
}

func TestCreateUser(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)

	for data, want := range map[string]string{
		`{}`: `[{"code":"invalid_type","path":["name"],"message":"Invalid input: expected string, received undefined"},{"code":"invalid_type","path":["username"],"message":"Invalid input: expected string, received undefined"},{"code":"invalid_type","path":["password"],"message":"Invalid input: expected string, received undefined"},{"code":"invalid_type","path":["role"],"message":"Invalid input: expected string, received undefined"},{"code":"invalid_type","path":["timezone"],"message":"Invalid input: expected string, received undefined"}]`,
		`{"name":"","username":"","password":"short","role":"owner","timezone":"Mars/Base"}`: `[{"code":"too_small","path":["name"],"message":"Name must have at least one character"},{"code":"too_small","path":["username"],"message":"Username must have at least one character"},{"code":"too_small","path":["password"],"message":"Password must have at least 8 characters"},{"code":"invalid_value","path":["role"],"message":"Invalid option: expected one of \"admin\"|\"user\""},{"code":"invalid_value","path":["timezone"],"message":"Invalid option: expected one of the supported timezones"}]`,
	} {
		response := userRequest(t, conn, "createUser", `,"data":`+data)
		if response["type"] != "error" || response["message"] != want {
			t.Errorf("data %s: response = %v", data, response)
		}
	}

	valid := `,"data":{"name":"New","username":"new","password":"password123","role":"user","timezone":"UTC"}`
	response := userRequest(t, conn, "createUser", valid)
	created, _ := response["data"].(map[string]any)
	if response["type"] != "createUserResponse" || created["id"] == nil {
		t.Fatalf("create = %v", response)
	}
	id := int(created["id"].(float64))
	if record, _ := s.C.Repository.Users().GetUserById(context.Background(), id); record == nil || !record.IsPasswordResetRequired || record.Role != "user" {
		t.Errorf("created user = %+v", record)
	}

	if response := userRequest(t, conn, "createUser", valid); response["message"] != userExistsMessage {
		t.Errorf("duplicate = %v", response)
	}
	entries := auditEvents(t, s, audit.UserCreated)
	if len(entries) != 1 || entries[0].Username != "admin" || !strings.Contains(entries[0].Details, `"username":"new"`) || strings.Contains(entries[0].Details, "password123") {
		t.Errorf("audit entries = %+v", entries)
	}

	long := userRequest(t, conn, "createUser", `,"data":{"name":"`+strings.Repeat("n", 256)+`","username":"`+strings.Repeat("u", 61)+`","password":"`+strings.Repeat("p", 129)+`","role":"user","timezone":"UTC"}`)
	if long["message"] != `[{"code":"too_big","path":["name"],"message":"Name must have at most 255 characters"},{"code":"too_big","path":["username"],"message":"Username must have at most 60 characters"},{"code":"too_big","path":["password"],"message":"Password must have at most 128 characters"}]` {
		t.Errorf("too long = %v", long)
	}
}

// A deleted user's name is free again; an existing one is refused.
func TestCreateUserRefusesExistingUsername(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	old := s.AddUser(t, "reused")

	data := `,"data":{"name":"Reused","username":"reused","password":"brandnew1","role":"user","timezone":"UTC"}`
	if response := userRequest(t, conn, "createUser", data); response["message"] != userExistsMessage {
		t.Fatalf("existing = %v", response)
	}
	if response := userRequest(t, conn, "deleteUser", `,"id":`+strconv.Itoa(old)); response["type"] != "deleteUserResponse" {
		t.Fatalf("delete = %v", response)
	}

	response := userRequest(t, conn, "createUser", data)
	created, _ := response["data"].(map[string]any)
	if response["type"] != "createUserResponse" || created["id"] == nil || created["id"] == float64(old) {
		t.Fatalf("create after delete = %v, old id %d", response, old)
	}
}

func TestUpdateUser(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	target := s.AddUser(t, "target")
	targetConn := s.Dial(t, target)
	id := strconv.Itoa(target)

	if response := userRequest(t, conn, "updateUser", `,"id":`+id+`,"data":{"name":"","new_password":"short","role":"x","timezone":"UTC"}`); response["message"] != `[{"code":"too_small","path":["name"],"message":"Name must have at least one character"},{"code":"too_small","path":["new_password"],"message":"Password must have at least 8 characters"},{"code":"invalid_value","path":["role"],"message":"Invalid option: expected one of \"admin\"|\"user\""}]` {
		t.Errorf("validation = %v", response)
	}
	if response := userRequest(t, conn, "updateUser", `,"id":`+id+`,"data":{"name":"`+strings.Repeat("n", 256)+`","new_password":"`+strings.Repeat("p", 129)+`","role":"user","timezone":"UTC"}`); response["message"] != `[{"code":"too_big","path":["name"],"message":"Name must have at most 255 characters"},{"code":"too_big","path":["new_password"],"message":"Password must have at most 128 characters"}]` {
		t.Errorf("too long = %v", response)
	}

	response := userRequest(t, conn, "updateUser", `,"id":`+id+`,"data":{"name":"Promoted","new_password":"password999","role":"admin","timezone":"UTC"}`)
	updated, _ := response["updated_data"].(map[string]any)
	if response["type"] != "updateUserResponse" || response["updated_id"] != float64(target) || updated["name"] != "Promoted" {
		t.Fatalf("update = %v", response)
	}
	if _, ok := updated["new_password"]; ok {
		t.Error("response echoes the new password")
	}

	pushed := handlerstest.Read(t, targetConn)
	user, _ := pushed["user"].(map[string]any)
	if pushed["type"] != "sessionUpdated" || user["role"] != "admin" || user["is_password_reset_required"] != true {
		t.Fatalf("pushed session = %v", pushed)
	}
	// The promoted user is an admin by now and sees the users list change.
	handlerstest.ExpectDataChanged(t, targetConn, "user", "["+id+"]")
	// The pending password reset blocks the promoted connection until the
	// step is done (SF-03); the session row carries the step as well.
	if response := userRequest(t, targetConn, "findUsers", `,"filters":{},"page":1`); response["message"] != "Required step must be completed first" {
		t.Errorf("promoted user with pending step = %v", response)
	}
	entries := auditEvents(t, s, audit.UserUpdated)
	if len(entries) != 1 || !strings.Contains(entries[0].Details, `"previous_role":"user"`) || !strings.Contains(entries[0].Details, `"role":"admin"`) || !strings.Contains(entries[0].Details, `"password_reset":true`) || strings.Contains(entries[0].Details, "password999") {
		t.Errorf("audit entries = %+v", entries)
	}

	for body, want := range map[string]string{
		`{"name":"Admin","role":"user","timezone":"UTC"}`:                               changeOwnRoleMessage,
		`{"name":"Admin","new_password":"password999","role":"admin","timezone":"UTC"}`: changeOwnPasswordMessage,
	} {
		if response := userRequest(t, conn, "updateUser", `,"id":1,"data":`+body); response["message"] != want {
			t.Errorf("self update %s = %v", body, response)
		}
	}
	// The admin's own tabs get the session push before the response.
	if pushed := userRequest(t, conn, "updateUser", `,"id":1,"data":{"name":"Boss","role":"admin","timezone":"UTC"}`); pushed["type"] != "sessionUpdated" {
		t.Errorf("self name update push = %v", pushed)
	}
	if response := handlerstest.Read(t, conn); response["type"] != "updateUserResponse" {
		t.Errorf("self name update = %v", response)
	}

	if response := userRequest(t, conn, "updateUser", `,"id":999,"data":{"name":"X","role":"user","timezone":"UTC"}`); response["message"] != userNotFoundMessage {
		t.Errorf("missing user = %v", response)
	}
}

func TestDeleteUserLogsOutEveryConnection(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	conn := s.Dial(t, handlerstest.AdminID)
	target := s.AddUser(t, "target")
	tabs := []*websocket.Conn{s.Dial(t, target), s.DialSession(t, target, "phone")}
	for _, tab := range tabs {
		userRequest(t, tab, "verifyOwnPassword", `,"password":"x"`)
	}

	if _, err := s.C.Repository.Sessions().CreateNewSession(ctx, repository.NewSessionRecord{Key: "target-session", UserId: target, ExpiresAt: time.Now().Add(time.Hour).UnixMilli(), Data: []byte(`{}`)}); err != nil {
		t.Fatal(err)
	}
	if created, err := s.C.Repository.Passkeys().CreatePasskey(ctx, repository.NewPasskeyRecord{PasskeyCredential: repository.PasskeyCredential{CredentialId: "cred", PublicKey: []byte{1}}, UserId: target, Name: "Key"}); err != nil || !created {
		t.Fatal(err)
	}

	if response := userRequest(t, conn, "deleteUser", `,"id":1`); response["message"] != deleteSelfMessage {
		t.Errorf("self delete = %v", response)
	}

	response := userRequest(t, conn, "deleteUser", `,"id":`+strconv.Itoa(target))
	if response["type"] != "deleteUserResponse" || response["deleted_id"] != float64(target) {
		t.Fatalf("delete = %v", response)
	}

	for i, tab := range tabs {
		if msg := handlerstest.Read(t, tab); msg["type"] != "forceLogoutResponse" || msg["namespace"] != "users" {
			t.Errorf("tab %d: message = %v", i, msg)
		}
		readCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		_, _, err := tab.Read(readCtx)
		cancel()
		if websocket.CloseStatus(err) != websocket.StatusPolicyViolation {
			t.Errorf("tab %d: connection not closed: %v", i, err)
		}
	}

	if record, _ := s.C.Repository.Users().GetUserById(ctx, target); record != nil {
		t.Error("user row kept")
	}
	if session, _ := s.C.Repository.Sessions().GetSessionByUserId(ctx, target); session != nil {
		t.Error("sessions kept")
	}
	if credentials, _ := s.C.Repository.Passkeys().GetUserPasskeyCredentials(ctx, target); len(credentials) != 0 {
		t.Error("passkeys kept")
	}
	if response := userRequest(t, conn, "deleteUser", `,"id":`+strconv.Itoa(target)); response["message"] != userNotFoundMessage {
		t.Errorf("second delete = %v", response)
	}
	if entries := auditEvents(t, s, audit.UserDeleted); len(entries) != 1 || !strings.Contains(entries[0].Details, `"username":"target"`) {
		t.Errorf("audit entries = %+v", entries)
	}
}

// Two admins acting at once could leave no administrator; the stale admin
// session stands in for the race.
func TestLastAdministratorIsKept(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	second := s.AddUserWithRole(t, "second", "admin")
	id := strconv.Itoa(second)

	if _, err := s.C.DB.ExecContext(context.Background(), `UPDATE "user" SET "role" = 'user' WHERE "id" = 1`); err != nil {
		t.Fatal(err)
	}
	if response := userRequest(t, conn, "updateUser", `,"id":`+id+`,"data":{"name":"Second","role":"user","timezone":"UTC"}`); response["message"] != lastAdminMessage {
		t.Errorf("demote = %v", response)
	}
	if response := userRequest(t, conn, "deleteUser", `,"id":`+id); response["message"] != lastAdminMessage {
		t.Errorf("delete = %v", response)
	}
	if response := userRequest(t, conn, "updateUser", `,"id":`+id+`,"data":{"name":"Renamed","role":"admin","timezone":"UTC"}`); response["type"] != "updateUserResponse" {
		t.Errorf("rename = %v", response)
	}
	if record, _ := s.C.Repository.Users().GetUserById(context.Background(), second); record == nil || record.Role != "admin" || record.Name != "Renamed" {
		t.Errorf("second admin = %+v", record)
	}
}

func TestFindUsers(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	s.AddUser(t, "alice")
	s.AddUser(t, "bob")

	response := userRequest(t, conn, "findUsers", `,"filters":{"username":" ali ","role":"user"},"page":1`)
	records, _ := response["records"].(map[string]any)
	results, _ := records["results"].([]any)
	if len(results) != 1 || results[0].(map[string]any)["username"] != "alice" {
		t.Errorf("filtered = %v", response)
	}
	if response := userRequest(t, conn, "findUsers", `,"filters":{"role":"admin"},"page":1`); response["records"].(map[string]any)["total"] != float64(1) {
		t.Errorf("admins = %v", response)
	}
}

func TestUserChangesReachOtherAdmins(t *testing.T) {
	s := newServer(t)
	conn := s.Dial(t, handlerstest.AdminID)
	tab := s.Dial(t, handlerstest.AdminID)
	otherAdmin := s.Dial(t, s.AddUserWithRole(t, "other", "admin"))
	user := s.AddUser(t, "user")
	userConn := s.Dial(t, user)

	response := userRequest(t, conn, "createUser", `,"data":{"name":"New","username":"new","password":"password123","role":"user","timezone":"UTC"}`)
	if response["type"] != "createUserResponse" {
		t.Fatalf("create = %v", response)
	}
	id := handlerstest.Encode(t, response["data"].(map[string]any)["id"])
	if other := handlerstest.Read(t, tab); other["type"] != "createUserResponse" {
		t.Errorf("admin's other tab = %v", other)
	}
	handlerstest.ExpectDataChanged(t, otherAdmin, "user", "["+id+"]")

	if response := userRequest(t, userConn, "updateProfile", `,"data":{"name":"Renamed","timezone":"UTC"}`); response["type"] != "sessionUpdated" {
		t.Errorf("profile push = %v", response)
	}
	if response := handlerstest.Read(t, userConn); response["type"] != "updateProfileResponse" {
		t.Errorf("profile = %v", response)
	}
	for _, admin := range []*websocket.Conn{conn, tab, otherAdmin} {
		handlerstest.ExpectDataChanged(t, admin, "user", "["+strconv.Itoa(user)+"]")
	}
}

func TestUserChangesReachEveryTab(t *testing.T) {
	s := newServer(t)
	ctx := context.Background()
	user := s.AddUser(t, "user")
	conn := s.Dial(t, user)
	tab := s.Dial(t, user)

	for _, step := range []struct{ message, want string }{
		{`"type":"updateProfile","data":{"name":"Renamed","timezone":"UTC"}`, "updateProfileResponse"},
		{`"type":"updateOnboarding","onboarding_state":{"introduction_dismissed":true}`, "updateOnboardingResponse"},
	} {
		handlerstest.Send(t, conn, `{"requestId":"r","namespace":"users",`+step.message+`}`)
		for _, c := range []*websocket.Conn{conn, tab} {
			handlerstest.ExpectType(t, c, "sessionUpdated")
			handlerstest.ExpectType(t, c, step.want)
		}
	}

	if created, err := s.C.Repository.Passkeys().CreatePasskey(ctx, repository.NewPasskeyRecord{PasskeyCredential: repository.PasskeyCredential{CredentialId: "cred", PublicKey: []byte{1}}, UserId: user, Name: "Key"}); err != nil || !created {
		t.Fatal(err)
	}
	passkeys, err := s.C.Repository.Passkeys().FindUserPasskeys(ctx, user, 1)
	if err != nil || len(passkeys.Results) != 1 {
		t.Fatalf("passkeys = %+v, %v", passkeys, err)
	}
	id := strconv.Itoa(passkeys.Results[0].Id)
	for _, step := range []struct{ message, want string }{
		{`"type":"updateOwnPasskey","id":` + id + `,"name":"Phone"`, "updateOwnPasskeyResponse"},
		{`"type":"deleteOwnPasskey","id":` + id, "deleteOwnPasskeyResponse"},
	} {
		if response := handlerstest.Request(t, conn, `{"requestId":"r","namespace":"users",`+step.message+`}`); response["type"] != step.want {
			t.Errorf("%s = %v", step.message, response)
		}
		handlerstest.ExpectType(t, tab, step.want)
	}

	admin := s.Dial(t, handlerstest.AdminID)
	adminTab := s.Dial(t, handlerstest.AdminID)
	if response := userRequest(t, admin, "updateUser", `,"id":`+strconv.Itoa(user)+`,"data":{"name":"Again","role":"user","timezone":"UTC"}`); response["type"] != "updateUserResponse" {
		t.Errorf("update = %v", response)
	}
	handlerstest.ExpectType(t, adminTab, "updateUserResponse")
	if response := userRequest(t, admin, "deleteUser", `,"id":`+strconv.Itoa(user)); response["type"] != "deleteUserResponse" {
		t.Errorf("delete = %v", response)
	}
	handlerstest.ExpectType(t, adminTab, "deleteUserResponse")
}
